---
title: "Retries, backoff and the 429 scopes"
description: "Write a retry policy that respects retry-after, branches on x-ratelimit-scope, never retries a 402, and doesn't stampede."
date: 2026-10-11
authors: [DiCompute team]
tags: [rate-limits, reliability, errors]
categories: [engineering]
cover: /blog-assets/blog/retries-backoff-and-the-429-scopes/banner.webp
coverAlt: "Duotone editorial illustration: ruled ledger lines crossed by small tally groups, one group picked out in accent; a cyan accent on a deep ink field."
---

Agentic apps that fire many parallel model calls turned rate-limit handling into a core engineering skill in 2026. A retry policy is a small piece of code that decides what happens on the worst day. Written badly, it makes an outage longer.

This post builds a retry wrapper for DiCompute from the semantics the [rate-limits page](/docs/rate-limits) and the [error reference](/api-console/errors) document. It goes deeper than the rate-limit section of the [API guide](/blog/building-on-the-dicompute-api). It is for developers running real traffic. It deliberately quotes no limit values: ceilings depend on your account and key, and the docs don't promise them. Read your own from the response headers.

## 1. Why naive retries make outages worse

The classic mistake is `while True: try: call(); except: sleep(1)`. When a service is under pressure, every client that failed at the same moment retries at the same moment. That is a retry storm, and it turns a short squeeze into a long one. Three habits prevent it: wait at least as long as the server says, add random jitter on top, and cap the number of attempts. A fourth habit matters just as much: don't retry errors that waiting can't fix.

## 2. Reading a 429

A rate-limit refusal from one of your own ceilings carries two signals:

```
HTTP/1.1 429 Too Many Requests
retry-after: 4
x-ratelimit-scope: account_requests
```

`retry-after` is in whole seconds. On capacity-shaped refusals it is computed from live queue depth, so it already reflects how long the service expects to need. Treat it as a floor, not a hint. `x-ratelimit-scope` names the ceiling that refused you. Branch on it, or on the message, never on `error.code` alone: on a 429 the code is coarser than the message, and several scopes share similar wording.

## 3. Account, key and organization scopes: what to change

The scope tells you what to change, so the policy can differ per scope:

| Scope | Meaning | What to do |
|---|---|---|
| `account_requests`, `account_tokens` | Your account's requests or settled-tokens ceiling | Wait for `retry-after`, or spread load over time |
| `account_concurrency` | Too many requests in flight for your account | Reduce concurrency |
| `key_requests`, `key_input_tokens`, `key_output_tokens` | One key's own override | Spread load across keys, or raise that key's ceiling |
| `organization` | An org-scoped route's ceiling | Reduce org-wide volume |
| `financial_requests` | The brake on checkout, key mint and other money-adjacent writes | Wait. It is deliberately stricter |
| `edge_burst` | A per-IP burst ceiling at the edge, before the API sees the request | Spread bursts out or lower parallelism from that IP. Changing key or plan does nothing |
| `auth_failures` | Too many failed authentications from your IP | Fix the credential. Don't retry |

The `edge_burst` response comes from the edge's own limiter, so its body can differ from the usual JSON and its `retry-after` is a fixed one second. Honor the header anyway.

## 4. at_capacity, and the 429 you must never retry

Some 429s have no `x-ratelimit-scope` header at all, so you recognize them by `error.message`. Two matter most.

An `at_capacity` refusal means every worker that serves the model is busy right now. It carries `retry-after` and is recognized by the message `at_capacity`. It isn't your ceiling, so lowering your own concurrency won't help. The [error reference](/api-console/errors) calls it the one 429 where a plain backoff loop is the right behavior: wait for `retry-after` plus jitter and resend unchanged. Compare that with `account_concurrency`, where reducing your own parallelism is the fix.

A message that starts `request is too large for model` is the opposite. Your prompt plus `max_tokens` exceeds the model's context window, which is 1,024 tokens for `qwen2.5-3b-instruct` at the time of writing (read `context_length` from `/openai/v1/models`). It arrives as a 429 with a `retry-after` header, but it can never succeed unchanged. Shrink the prompt or lower `max_tokens`. A loop that retries every 429 burns its whole budget on this one, then reports "rate limited" for a request that was simply too big.

## 5. 402: never retry on a timer

A `402` with `insufficient_quota` is a money-path refusal, not a rate limit. It means `insufficient_balance` or `spend_cap_exceeded`. Nothing changes while you wait, so a timer-based retry just repeats the refusal. Surface it to a human or to your billing flow: add credit or raise the cap, then resume. A `503` is different again: a deployment-level condition, such as a feature that isn't configured or a failing health check. Retry it a few times with backoff, but don't expect more aggression from you to fix it.

Know the billing side too. A refusal before the reservation costs nothing, and a failure before the first output byte is refunded in full. A stream that dies after emitting tokens settles for the tokens received, floored at $0.0001. A retry of a stream is a new request and is charged for what it delivers.

## 6. Pace before you hit the limit

A successful authenticated response reports the ceiling that admitted it: `x-ratelimit-limit`, `x-ratelimit-remaining` and `x-ratelimit-reset` (whole seconds until the window rolls). Use them to slow down before a 429. Two caveats from the docs: a fixed window admits a burst at the boundary between two windows, so don't treat `remaining` as a promise, and `/openai/v1/models` carries none of these headers because it sits under a per-IP public-read bucket.

## 7. A retry wrapper in Python

This wrapper uses the `openai` package with its own retries turned off, so the two policies don't stack. It honors `retry-after`, adds jitter, uses exponential backoff with full jitter for server errors, refuses to retry a 402, and paces on `x-ratelimit-remaining`:

```python
import random
import time

import openai
from openai import OpenAI

MAX_ATTEMPTS = 5
BACKOFF_BASE = 1.0   # seconds
BACKOFF_CAP = 30.0   # seconds

client = OpenAI(
    base_url="https://dicompute.ai/openai/v1",
    api_key="sk-dico-...",  # read it from the environment in real code
    max_retries=0,          # we own the retry policy; don't stack the SDK's on top
)


def chat(messages, max_tokens=128):
    for attempt in range(MAX_ATTEMPTS):
        try:
            raw = client.chat.completions.with_raw_response.create(
                model="qwen2.5-3b-instruct",
                messages=messages,
                max_tokens=max_tokens,
            )
        except openai.RateLimitError as e:
            scope = e.response.headers.get("x-ratelimit-scope")  # None for at_capacity
            retry_after = int(e.response.headers.get("retry-after", "1"))
            if "request is too large for model" in str(e):
                raise  # prompt + max_tokens exceed the context window: shrink, don't retry
            if scope == "auth_failures" or attempt == MAX_ATTEMPTS - 1:
                raise  # a wrong credential won't fix itself
            # honor retry-after, then add jitter so clients don't retry in lockstep
            delay = retry_after + random.uniform(0, 1 + 0.25 * retry_after)
            print(f"429 scope={scope or 'none'} "
                  f"request_id={e.response.headers.get('x-request-id')} wait={delay:.1f}s")
            time.sleep(delay)
        except openai.APIStatusError as e:
            if e.status_code == 402:
                raise  # insufficient_quota: add credit or raise the cap
            if e.status_code not in (500, 502, 503, 504) or attempt == MAX_ATTEMPTS - 1:
                raise
            time.sleep(random.uniform(0, min(BACKOFF_CAP, BACKOFF_BASE * 2**attempt)))
        except (openai.APIConnectionError, openai.APITimeoutError):
            if attempt == MAX_ATTEMPTS - 1:
                raise
            time.sleep(random.uniform(0, min(BACKOFF_CAP, BACKOFF_BASE * 2**attempt)))
        else:
            remaining = raw.headers.get("x-ratelimit-remaining")
            reset = raw.headers.get("x-ratelimit-reset")
            if remaining == "0" and reset:
                time.sleep(int(reset) + random.uniform(0, 1))
            return raw.parse()
```

A few choices are worth explaining. `AuthenticationError` and `RateLimitError` are both subclasses of `APIStatusError`, so the order of the `except` clauses matters: a 401 falls through to the status branch and is raised at once, which is what you want. The too-large check runs before any wait, because that 429 can't succeed on retry. The `print` line logs `x-request-id`, the first thing you'll need for any follow-up. And the wrapper retries only 500, 502, 503 and 504, never other 4xx errors, because a `400` will fail identically on every attempt.

To prove your setup without spending anything, run this with the key above left as an obviously invalid value. You should get a `401`, raised on the first attempt with no waiting.

## Next steps

- [Rate limits](/docs/rate-limits): every scope, with the fix for each.
- [Errors](/api-console/errors): all conditions, with retry advice and billing effect.
- [Building on the DiCompute API](/blog/building-on-the-dicompute-api): the shorter rate-limit section and the rest of the integration.
- [Billing](/docs/billing): reservations, refunds and the per-request minimum.
