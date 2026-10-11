---
title: "Which API errors cost money"
description: "A refusal before reservation is free, an early failure is refunded, and a stream that dies mid-answer settles for what you received. Here's how to tell."
date: 2026-10-11
authors: [DiCompute team]
tags: [billing, errors, api]
categories: [engineering]
cover: /blog-assets/blog/which-api-errors-cost-money/banner.webp
coverAlt: "Duotone editorial illustration: ruled ledger lines crossed by small tally groups, one group picked out in accent; a cyan accent on a deep ink field."
---

Cost accountability for failed and partial LLM calls became a FinOps concern
in 2026. The question teams ask is simple: when a call fails, did I pay for
it? DiCompute's documented answer is one rule: **you pay for the tokens that
were actually delivered to you, and nothing else.** This post turns that rule
into the three cases you will meet, shows where each one appears in your
account usage, and covers what it means for retry code.

One limit on what this post proves. The rule comes from the
[error reference](/api-console/errors) and the [billing docs](/docs/billing).
I didn't trigger a mid-stream failure on a funded account to watch it settle,
so the examples below are the documented behavior, and you should reconcile
against your own usage rows before you rely on it. The snippets were run with
an invalid key, which returned the expected `401`.

## The one rule: you pay for tokens actually delivered

Every inference request goes through reserve, then settle:

1. **Reserve.** After authentication and validation, the API holds a
   worst-case amount against your balance. It is sized from your
   `max_tokens` (or `max_completion_tokens`) and the model's output rate.
2. **Settle.** When the request finishes, the hold is replaced by the actual
   charge, computed from the real `usage` numbers. The difference is
   released back to you.
3. **Refund.** If the request never reached the engine, or the engine failed
   outright, the whole reservation is refunded.

There is a floor. Every settled charge is at least $0.0001 (100 µUSD), where
1 µUSD is $0.000001. The pricing feed reports it as `min_charge_uusd`.

## Refused before reservation: no ledger entry

Most errors are refusals that happen before the reservation opens, and the
error reference marks them as not billed: "no ledger entry of any kind". That
covers a bad key (`401`), a key without the right scope (`403`), a malformed
body (`400`), an unknown or forbidden model, and rate limits (`429`).

The important one is `402 insufficient_quota`. It arrives when the balance
can't cover the **worst case**, and the refusal is itself the reservation
failing to open, so nothing is held or charged. Because the hold is sized on
`max_tokens`, a large `max_tokens` can be declined on a balance that would
have paid the real bill. Lower `max_tokens` first. A `402` is also never
something to retry on a timer: `insufficient_balance` and `spend_cap_exceeded`
both need a change on your side, either funds or a higher key cap.

Refused requests still appear in the `requests` series of your usage, as
rows with `charged: false`, so you can see them without finding them in the
ledger.

## Failed before the first byte: a reserve and refund pair

If the reservation opened but nothing reached you, the whole hold is refunded.
The documented cases:

- `upstream_unavailable` (`502`, or a `429` when the cause is capacity),
  where the engine was unreachable or failed before producing output.
- `upstream_deadline_exceeded` (`504`), where the total deadline fired before
  the engine sent response headers.
- `upstream_client_error`, where the engine rejected the request.
- `media_fetch_failed`, where a remote image URL could not be resolved.

In your usage, each of these shows as a `reserve` row and a `refund` row for
the same request, netting to zero.

## Mid-stream failure: settled for the tokens you received

The one case that costs money is a stream that dies **after** it has emitted
tokens: a dropped connection, a cancelled request, an engine that fails
mid-answer, or the total deadline firing. It settles for the tokens you
received, floored at the same $0.0001. It is charged whether or not the stream
ended cleanly, but never for the part you didn't get.

The client sees this as a `200` that has already committed, followed by an
in-band error frame:

```text
data: {"error":{"code":"upstream_connection_reset", ...}}

data: [DONE]
```

Treat any `error` frame as terminal, and stop at the `[DONE]` that follows.
There is no resume. A retry is a new request, which regenerates from the
start and is charged for what it delivers, prompt included.
`Idempotency-Key` is refused on streaming requests (`422`), so it can't
protect you here.

| What happened | Charged |
|---|---|
| Refused before reservation (`400`, `401`, `402`, `403`, `429`) | nothing |
| Failed before any output reached you | nothing, via refund |
| Stream died after tokens were emitted | tokens received, minimum $0.0001 |
| Completed normally | actual usage, minimum $0.0001 |

## Reading reserve, settle and refund in account usage

`GET /openai/v1/account/usage` is the itemized journal for your account. It
needs your key, and it returns one row per ledger movement in `data`:

```bash
curl -sS "https://dicompute.ai/openai/v1/account/usage?limit=50" \
  -H "authorization: Bearer $DICO_KEY"
```

Each row has a `type` (`reserve`, `settle` or `refund`), a signed `delta_uusd`
and a `reference` carrying the `requestId`. A second series, `requests`, has
one row per HTTP request, billed or not, with `outcome`, `http_status`,
`error_code` and `charged`. Pass `?limit=` (default 50, at most 200) and page
back with `next_before`. Group rows by `requestId` and you can check any
failure against the table above.

To reconcile one request, take its `x-request-id` (every response carries
one) and call:

```bash
curl -sS "https://dicompute.ai/openai/v1/account/usage/requests/req_..." \
  -H "authorization: Bearer $DICO_KEY"
```

It returns the outcome, status, token counts, the amount charged in µUSD and
each dispatch attempt. A non-streaming response also carries
`usage.cost_uusd` for the amount it was charged. In a stream it arrives on the
last chunk before `[DONE]`. The field is omitted when nothing was charged, and
for a stream cut off by a deadline or reset, so the usage journal is the
authority there.

A small Python check, using the `requests` package, that flags error responses
which were charged anyway:

```python
import os
import requests

r = requests.get(
    "https://dicompute.ai/openai/v1/account/usage?limit=200",
    headers={"authorization": f"Bearer {os.environ['DICO_KEY']}"},
    timeout=30,
)
r.raise_for_status()
for req in r.json()["requests"]:
    if req["http_status"] >= 400 and req["charged"]:
        print("check this one:", req["request_id"], req["http_status"], req["error_code"])
```

Per the table above, nothing should print. A mid-stream failure is a `200`
that has already committed, so this check doesn't see it, and its settle row is
legitimate. If a refusal or an early failure does print, read that request in
the ledger and send us its `x-request-id`.

## Designing retries with this in mind

- **Retry the free failures.** `502` and `504` before output, and `429` with
  `retry-after`, cost nothing. Back off, and honor `retry-after`.
- **Branch on the message, not just `error.code`.** On a `429`, `code` is
  coarser than `message`. Fleet congestion clears on its own. An oversized
  prompt never does, and SDKs that auto-retry will burn their budget on it.
  The `x-ratelimit-scope` header carries the account-ceiling cases.
  [Rate limits](/docs/rate-limits) lists every scope.
- **Don't retry a `402` on a timer.** Retry once a concurrent request settles
  and releases its hold, or after you add funds.
- **Salvage partial streams.** If a stream dies, you already paid for what
  arrived. Fold the received text into a continuation prompt instead of
  regenerating from scratch, and keep prompts short on a 1,024-token model.
- **Log `x-request-id`** on every attempt, so any failed call can be matched
  to a usage row later.

## Next steps

- [Error reference](/api-console/errors): every condition, with its retry advice and billing effect.
- [Billing](/docs/billing): reserve, settle, the minimum charge and the usage journal.
- [Rate limits](/docs/rate-limits): scopes and `retry-after`.
- [Building on the DiCompute API](/blog/building-on-the-dicompute-api): keys, streaming and error handling basics.
