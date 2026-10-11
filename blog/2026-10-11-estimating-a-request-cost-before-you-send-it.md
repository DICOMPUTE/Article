---
title: "Estimating a request's cost before you send it"
description: "Use /openai/v1/estimate, max_tokens and the pricing feed to know a request's worst case and expected cost before it runs."
date: 2026-10-11
authors: [DiCompute team]
tags: [billing, cost-control, api]
categories: [engineering]
cover: /blog-assets/blog/estimating-a-request-cost-before-you-send-it/banner.webp
coverAlt: "Duotone editorial illustration: ruled ledger lines crossed by small tally groups, one group picked out in accent; a cyan accent on a deep ink field."
---

Per-request cost guardrails became mainstream engineering practice for LLM
apps in 2026. The idea is old: know what a call can cost before you make it.
DiCompute helps in three ways. There is a public estimate endpoint that needs
no key. The pricing feed is live. And the worst case of every request is
bounded by a number you choose, `max_tokens`. This post shows each, with real
output, and ends with a small budget guard you can drop into your own code.

The numbers here are values from 2026-10-11, quoted from the live feeds so you
can see the shape of the responses. Prices can change, and the
[pricing page](/pricing) and `/openai/v1/pricing` are the source of truth, so
read them live rather than copying a price into code.

## Why estimate first: reservation is driven by max_tokens

Before a request runs, the API reserves its worst-case cost against your
balance. It sizes the hold from your output cap, `max_tokens`, and the model's
price. When the request finishes, it settles at what it actually used, and the
difference is refunded straight away. That has two consequences:

- A request with a huge `max_tokens` can be refused with
  `402 insufficient_quota`, even if the model would have answered in ten
  words. The hold is checked before any token is generated, and a refusal
  costs nothing.
- The output cap is the one part of the cost you control. Lowering it lowers
  the reservation directly.

An estimate tells you the hold before you commit to it. The
[billing docs](/docs/billing) describe the full reserve and settle flow.

## POST /openai/v1/estimate, with real output

The route takes a model, an input-token count and an output-token cap. It
doesn't need a key or a messages array, and the body must be sent as
`application/json`.

```bash
curl -sS https://dicompute.ai/openai/v1/estimate \
  -H 'content-type: application/json' \
  -d '{"model":"qwen2.5-3b-instruct","input_tokens":500,"output_tokens":200}'
```

Trimmed to the fields that matter, the live response was:

```json
{
  "object": "cost_estimate",
  "model": "qwen2.5-3b-instruct",
  "input_tokens": 500,
  "output_tokens": 200,
  "price_snapshot": {
    "input_uusd_per_mtok": 50000,
    "output_uusd_per_mtok": 200000,
    "snapshot_at": "2026-10-11T12:42:43.724Z"
  },
  "base_cost_before_minimum_uusd": 65,
  "min_charge_uusd": 100,
  "estimated_reservation_uusd": 100,
  "estimated_settled_uusd": 100,
  "estimated_reservation_usd": "$0.0001"
}
```

Read it like this. `estimated_reservation_uusd` is the worst-case hold a real
request would reserve. `estimated_settled_uusd` is the likely final charge.
All amounts are integer micro-USD (µUSD), where 1 µUSD is $0.000001. The 65
comes from the price snapshot: 500 input tokens at 50,000 µUSD per million is
25, and a 200-token output cap at 200,000 µUSD per million is 40. Prices are
per million tokens, so every figure is `tokens × price / 1,000,000`.

Some limits to know about:

- Each token count must be a whole number from 0 to 100,000,000. Anything else
  is a `400 invalid_request` with `param` naming the field. I sent
  `input_tokens: -1` and got exactly that.
- An unknown model id is a `404 model_not_found`.
- A body without a JSON content type gets `415`. A curl `-d` with no header, which sends it as form data, got that.
- The route has its own per-IP rate limit, 30 requests a minute by default,
  and past it you get a `429` with `retry-after`.
- It prices the synchronous lane only. The batch discount is a separate lane
  that this estimate never reflects (see the pricing feed's
  `batch_discount_percent`).

## The chat-completions estimate route for a full request body

`POST /openai/v1/chat/completions/estimate` takes a full chat-completions body
instead. Unlike `/estimate`, it is not public. The API reference says it
requires a key scoped for inference, the same scope chat completions itself
needs. Called with no key or an invalid one, it returned the standard `401`.
With a key, the [billing docs](/docs/billing) say it also returns a `caps`
array that shows whether any spend cap would refuse the request. It
reserves nothing:

```bash
curl -sS https://dicompute.ai/openai/v1/chat/completions/estimate \
  -H "authorization: Bearer $DICO_KEY" \
  -H 'content-type: application/json' \
  -d '{"model":"qwen2.5-3b-instruct","messages":[{"role":"user","content":"say OK"}],"max_tokens":128}'
```

`/estimate` also accepts a key, optionally. A key makes the
quote account-specific, with any per-account price overrides applied. Without
one, `/estimate` quotes the public platform rates, exactly like the pricing
feed. The OpenAPI spec at `/openai/v1/openapi.json` has both schemas, and
[/api-console](/api-console) is the interactive reference.

## The $0.0001 minimum and when it dominates

Every settled charge, and every reservation, is floored at 100 µUSD ($0.0001).
The pricing feed reports it as `min_charge_uusd`. In the example above, the
real cost is 65 µUSD, so the floor wins and the estimate reads 100. For a
small request on a cheap model, the floor is most of the bill, and token
trimming gains you nothing. The cross-over, for this model's rates, is a
request whose token cost passes 100 µUSD.

A request near the other extreme looks different. I asked for 100,000 input
and 100,000 output tokens on the same model, and the estimate was 25,000
µUSD, with no floor involved. The estimate is also how you answer "would this
request be refused for lack of balance?" before it is sent.

## Prices from /openai/v1/pricing in integer µUSD

```bash
curl -sS https://dicompute.ai/openai/v1/pricing \
  | jq '.prices[] | {id, input_price, output_price}'
```

Each entry has `input_price` and `output_price` in µUSD per million tokens,
alongside formatted USD strings. The feed also carries `min_charge_uusd` and
`batch_discount_percent`. The docs say the feed comes from the same resolver
the billing path uses, so it can't quote a rate other than the one you are
charged. A price change landing mid-request can't affect that request either,
since each request resolves its price once before it reserves.

## A budget guard function

Here is a guard that refuses to send a call whose worst case is over a
per-request budget. It uses only the public estimate route:

```python
import requests

BASE = "https://dicompute.ai/openai/v1"


class OverBudget(Exception):
    pass


def worst_case_uusd(model: str, input_tokens: int, max_output_tokens: int) -> int:
    r = requests.post(
        f"{BASE}/estimate",
        json={"model": model, "input_tokens": input_tokens, "output_tokens": max_output_tokens},
        timeout=10,
    )
    r.raise_for_status()
    return r.json()["estimated_reservation_uusd"]


def guard(model: str, input_tokens: int, max_output_tokens: int, budget_uusd: int) -> int:
    cost = worst_case_uusd(model, input_tokens, max_output_tokens)
    if cost > budget_uusd:
        raise OverBudget(f"{model}: worst case {cost} µUSD exceeds budget {budget_uusd} µUSD")
    return cost
```

I ran it live. `guard("qwen2.5-3b-instruct", 500, 200, budget_uusd=1_000)`
returned `100`. Asking for a million input and a million output tokens on
`qwen2.5-0.5b-instruct` with the same budget raised `OverBudget`, with a worst
case of 50,000 µUSD.

Two cautions. First, the estimate route is rate-limited per IP, so cache
quotes in a busy service. You can also compute the figure locally from
`input_price`, `output_price` and the floor, and refresh the prices on a
timer. Second, the guard checks the worst case, so it will sometimes refuse a
request that would really have been cheap. That's the point of it, and you can
lower `max_output_tokens` to fit.

## Client-side token counting, and its limits

You need an `input_tokens` number to ask for an estimate. The browser tools at
[/tools/token-counter](/tools/token-counter) and [/tools/context-check](/tools/context-check) count
tokens locally, and the text never leaves the page. They give a count. They
don't replace the `usage` object on a real response, which is what the charge
is computed from. Treat any client-side count as an estimate, and leave
headroom: on `qwen2.5-3b-instruct`, the context window is only 1,024 tokens,
and the input and output caps share it.

## Next steps

- [Billing](/docs/billing): reserve, settle, the minimum charge and the estimate route.
- [Pricing](/pricing): the live rate table.
- [Token counter](/tools/token-counter): count a prompt in the browser.
- [Building on the DiCompute API](/blog/building-on-the-dicompute-api): keys, streaming and errors.
