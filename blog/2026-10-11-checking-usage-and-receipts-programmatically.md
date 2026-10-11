---
title: "Checking usage and receipts programmatically"
description: "Reconcile what you were charged from usage and the pricing feed, look up any request by id, and verify fleet receipts with a public endpoint."
date: 2026-10-11
authors: [DiCompute team]
tags: [verification, billing, receipts]
categories: [engineering]
cover: /blog-assets/blog/checking-usage-and-receipts-programmatically/banner.webp
coverAlt: "Duotone editorial illustration: ruled ledger lines crossed by small tally groups, one group picked out in accent; a cyan accent on a deep ink field."
---

As AI spend grew through 2026, "verify, don't trust" moved from a security slogan to a billing requirement: teams wanted to reproduce an invoice line, not just read it. DiCompute gives you three things to check programmatically: the arithmetic from token usage to charge, a per-request lookup, and signed receipts you can verify with a public endpoint.

The limit comes first, because it shapes everything else. Receipts exist only on responses served by the fleet path. Most traffic today is served direct-to-engine, including everything on `qwen2.5-3b-instruct`, and that path produces no receipt. For those requests, the usage arithmetic and the request lookup are the checks you have. This post is also not about on-chain settlement as a payment system: the contracts that [/verify](/verify) reads are on the XDC Apothem testnet.

## Usage times price equals charge

Every response carries the standard OpenAI `usage` object, streaming or not. Multiply it by the per-model rates from `GET /openai/v1/pricing`, which is served from the same resolver the billing path uses, so it cannot quote a different rate than the one you were charged ([verification](/docs/verification)). The feed gives rates as micro-USD per million tokens in `input_price` and `output_price`:

```python
import json
import urllib.request

BASE = "https://dicompute.ai/openai/v1"


def get(path: str):
    # Set a User-Agent: the edge refuses urllib's default one with a 403.
    req = urllib.request.Request(f"{BASE}{path}", headers={"User-Agent": "my-app/1.0"})
    with urllib.request.urlopen(req) as r:
        return json.load(r)


def expected_charge_uusd(model: str, prompt_tokens: int, completion_tokens: int) -> int:
    pricing = get("/pricing")
    rates = next(p for p in pricing["prices"] if p["id"] == model)
    raw = (prompt_tokens * rates["input_price"] + completion_tokens * rates["output_price"]) / 1_000_000
    return max(round(raw), pricing["min_charge_uusd"])


print(expected_charge_uusd("qwen2.5-3b-instruct", 12_000, 4_000))
```

At the rates the feed reported when we ran it ($0.05 input and $0.20 output per million tokens for `qwen2.5-3b-instruct`), that prints `1400` micro-USD. The public estimate endpoint agrees: `POST /openai/v1/estimate` with `{"model":"qwen2.5-3b-instruct","input_tokens":12000,"output_tokens":4000}` returns `estimated_settled_uusd: 1400`. (That 12,000-token prompt is far beyond this model's 1,024-token window. It is arithmetic, not a request you could send.) Rates are live values, so read them each time. The [billing doc](/docs/billing) notes that prices can change without a deploy.

The docs do not specify rounding, so allow a few micro-dollars of tolerance when you compare. One more case to know: if the upstream engine's usage report was missing or implausible, the API falls back to its own character-count estimate. The response shape is identical either way, so you cannot tell from the response alone.

## The minimum-charge exception

Every settled charge is floored at 100 micro-USD, or $0.0001, per request. The feed reports it as `min_charge_uusd`, and the `max(...)` in the code above is the floor. For example, 500 input and 200 output tokens on `qwen2.5-3b-instruct` come to 65 micro-USD of raw cost, and `POST /openai/v1/estimate` shows `base_cost_before_minimum_uusd: 65` and `estimated_settled_uusd: 100`. The floor also applies to the reservation, which is why a balance under 100 micro-USD gets a `402` even for a request that would cost 1. Accounts on the by-arrangement service tier are billed without the floor, but that is operator-granted, not self-serve.

## Looking up one request by id

Every response carries `x-request-id: req_<uuid>`. Log it next to your own request id. With your key, `GET /openai/v1/account/usage/requests/{request_id}` returns model, outcome, HTTP status, usage tokens, the amount charged in micro-USD and each dispatch attempt, scoped to your account. A `.../receipt` variant returns the same object as a file download.

```bash
curl -sS https://dicompute.ai/openai/v1/account/usage/requests/req_00000000-example \
  -H "authorization: Bearer $DICO_KEY"
```

We ran that with an invalid key and got the standard `401` body, so the route and header shape are right. The lookup answers "what happened to a request whose id I still have". It is not a list. Replaying a request for a dispute is an operator action, not self-serve, so quote the id in your support message.

## Account usage history

For the list, use `GET /openai/v1/account/usage?limit=50`. It returns your ledger journal, one signed row per movement, plus a `requests` series with one row per HTTP request, billed or not. Page backwards with `before=<next_before>`. The `settled_uusd` total covers only the page you fetched, so accumulate across pages for a full total. For a date range or accounting hand-off, `GET /openai/v1/account/usage/export?from=<ms>&to=<ms>` returns CSV or JSON, capped at 20,000 rows and refused (not truncated) beyond that. Summing its `charged_uusd` column over a window reproduces the settled total.

## Which responses carry `dico_receipt`

A fleet-served response carries a `dico_receipt` object: a usage receipt signed by the worker and countersigned by the coordinator. It sits at the top level of a non-streaming body, or in a trailing SSE frame before `[DONE]` when streaming. Only fleet-served responses have one, and the platform strips the field from anything else, so its absence is the honest signal that the request went direct-to-engine. At the moment the fleet path carries traffic for one internal test account only, so you should expect no receipts on ordinary requests. The lookup above says so explicitly: a request without one reports `{"present": false, "proof": null}` in its `signature` field.

## `POST /openai/v1/receipts/verify`

If you do hold a receipt, you can verify it yourself (keccak256 hashing and secp256k1 signatures, per the [verification doc](/docs/verification)) or let the platform run the checks. The endpoint is public and takes no credential, since a verifier by definition does not hold the payer's key. Post back the exact `dico_receipt` object you received:

```bash
curl -sS -X POST https://dicompute.ai/openai/v1/receipts/verify \
  -H 'content-type: application/json' \
  -d '{}'
```

An empty body returns `400 invalid_request` with the message "request body is not a valid receipt verification request", which confirms the route is up. A real receipt returns a `valid` verdict with per-signature results. It is rate limited per source address, so batch your checks.

## What you can't verify yet

The verification doc lists its own limits, and they are worth reading before you rely on a `valid: true`:

- The direct-to-engine path has no receipt, so for most traffic your check is the arithmetic above.
- A `valid: true` verdict shows only that the two signatures match the public keys carried inside the receipt. A receipt forged with someone else's keys would pass too, so it does not prove the keys are DiCompute's.
- The `request_id` inside a receipt is not covered by either signature, so a genuine receipt could be attached to a different response.
- There is no self-serve replay of a request.

So cross-check both keys yourself. Compare `worker_signing_pubkey` with `signingPubkeyHex` from `GET https://dicompute.ai/v1/attestation/<workerId>`, as the doc describes, and `coordinator_signing_pubkey` with the key that `GET https://dicompute.ai/v1/attestation/coordinator` publishes. That is the step that stops a receipt from vouching for itself.

## Next steps

- Read [Verifying what was served](/docs/verification) for the full receipt recipe.
- Read [billing](/docs/billing) for units, estimates and the usage feeds.
- Check epoch commitments on the testnet at [/verify](/verify).
- Start with [Building on the DiCompute API](/blog/building-on-the-dicompute-api) for the basics.
