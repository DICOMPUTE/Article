---
title: "Testing your integration with sandbox keys"
description: "Sandbox keys run every check a live key does but never bill. How to use them in CI to test auth, errors and retries for free."
date: 2026-10-11
authors: [DiCompute team]
tags: [testing, api-keys, ci]
categories: [engineering]
cover: /blog-assets/blog/testing-your-integration-with-sandbox-keys/banner.webp
coverAlt: "Duotone editorial illustration: ruled ledger lines crossed by small tally groups, one group picked out in accent; a cyan accent on a deep ink field."
---

Cost-aware CI for LLM apps, meaning tests that don't burn tokens on every push, was a growing practice in 2026. The usual answer is to mock the model client, but a mock can't tell you whether your request is valid, your scopes are right or your retry code reads real headers. DiCompute has a feature built for this gap: sandbox keys.

This post is for developers who want deterministic, free integration tests. It explains what a sandbox key is, what it exercises, and how to wire it into a pipeline. One caution runs through it: a sandbox response is canned. It tells you your plumbing works. It tells you nothing about what a model would say.

## 1. The problem: tests that spend money

An integration test that calls a real model costs money on every run, returns different text each time, and fails when capacity is tight for reasons that have nothing to do with your code. So teams either skip integration tests or mock everything. Sandbox keys give you a third option: a real call to the real API that never touches the billing path.

## 2. Minting a sandbox key

`POST /openai/v1/keys` takes an optional `mode` field. `"live"` is the default. Ask for `"sandbox"`:

```bash
curl -sS -X POST https://dicompute.ai/openai/v1/keys \
  -H "authorization: Bearer $DICO_KEY" \
  -H "content-type: application/json" \
  -d '{"mode": "sandbox"}'
```

You authenticate this call with an existing key. The new key starts with `sk-dico-test-` instead of `sk-dico-`, so you can tell the two apart at a glance, and like every key it is shown once. Copy it straight into your CI secret store. Mint it once by hand, not on every pipeline run. Try the call with `sk-dico-invalid-example` first, and you should see the standard `401` with `"code":"invalid_api_key"`, which proves the URL and body are well formed. The [authentication docs](/docs/authentication) cover sandbox mode, and [API keys](/docs/api-keys) cover scopes, spend caps and expiry.

## 3. What runs, and what doesn't

A sandbox key behaves like a live key up to the point where money and models would be involved:

| Runs exactly as for a live key | Skipped |
|---|---|
| Authentication | Reserving and settling balance |
| Scopes | Dispatching to any real worker |
| Rate limits | A real completion |
| The `Idempotency-Key` header | |
| Request validation | |

Instead of a completion you get a canned payload marked `sandbox_response: true`. Scopes, spend caps, expiry and revocation all work the same as on a live key. That makes sandbox keys a good fit for tests of malformed requests, error-code branching and your retry logic, which is the territory a mock gets wrong.

Be clear about the limits. The text in a sandbox response is not model output, so don't assert on it and don't use it to judge quality. There's no real latency to measure and no real usage to reconcile.

## 4. Detecting `sandbox_response` in your code

Make your test harness check twice that it's in sandbox mode: once from the key prefix and once from the response. If the two disagree, stop the run. This guard catches the most expensive mistake, a live key leaking into a test environment:

```python
import httpx

BASE = "https://dicompute.ai/openai/v1"


def is_sandbox_key(key: str) -> bool:
    return key.startswith("sk-dico-test-")


def chat(key: str, content: str):
    r = httpx.post(
        f"{BASE}/chat/completions",
        headers={"authorization": f"Bearer {key}"},
        json={
            "model": "qwen2.5-3b-instruct",
            "messages": [{"role": "user", "content": content}],
            "max_tokens": 16,
        },
        timeout=30,
    )
    body = r.json()
    sandboxed = body.get("sandbox_response") is True
    if sandboxed != is_sandbox_key(key):
        raise RuntimeError("key mode and response disagree: stop the run")
    return r.status_code, sandboxed, body
```

With the invalid example key, this returns a `401` and `sandboxed` is `False`, because the request is refused before any mode is involved. With a real sandbox key, a `200` should come back with `sandboxed` true. Inspect one response from your own key to see exactly what the canned payload contains before you write assertions against it.

## 5. A sandbox key can never become live

A key's mode is fixed when it is minted and carried forward, never re-decided. Rotating a sandbox key always produces another sandbox key. The docs describe the sandbox path as fail-closed: every exit is a return, so a bug there can fail a request but can't silently promote it to a billed dispatch. That is the property a CI secret needs: leaking a sandbox key doesn't hand anyone a way to spend your balance on inference. To go live, mint a new live key.

## 6. A CI pattern: sandbox for the pipeline, live for one smoke test

Run the bulk of your integration tests with the sandbox key on every pull request. Run one live smoke test, with a tightly capped live key, only on your main branch or on a schedule:

```yaml
jobs:
  integration:
    runs-on: ubuntu-latest
    env:
      DICO_KEY: ${{ secrets.DICO_SANDBOX_KEY }}   # sk-dico-test-...
    steps:
      - uses: actions/checkout@v4
      - run: pytest tests/integration -q

  live-smoke:
    if: github.ref == 'refs/heads/main'
    needs: integration
    runs-on: ubuntu-latest
    env:
      DICO_KEY: ${{ secrets.DICO_LIVE_SMOKE_KEY }}  # capped live key
    steps:
      - uses: actions/checkout@v4
      - run: pytest tests/smoke -q
```

Give the live smoke key a per-key spend cap and a model allowlist, both described in the [API keys](/docs/api-keys) docs, and keep its prompt short with a small `max_tokens`. The smoke test pays for itself by checking the one thing a sandbox can't: that a real request still completes. Keep it to a single call, because it spends real balance.

## 7. Keeping sandbox and live keys apart

- Store them under different secret names, as above. `DICO_SANDBOX_KEY` and `DICO_LIVE_SMOKE_KEY` leave no doubt which is which.
- Fail fast on a mismatch. In tests, assert that the key starts with `sk-dico-test-`. In production, assert that it doesn't.
- Never mint keys inside the pipeline. Minting needs an existing key, and a credential that can mint keys is one you don't want sitting in CI.
- Treat a `sandbox_response: true` body in production as an incident, not a curiosity. It means a sandbox key is in the wrong place, and your users are getting canned answers.

## Next steps

- [Authentication](/docs/authentication): sandbox mode, key scopes and revocation.
- [API keys](/docs/api-keys): per-key spend caps, model allowlists, expiry and rotation.
- [Building on the DiCompute API](/blog/building-on-the-dicompute-api): the live-key walkthrough, from first request to rate limits.
- [Errors](/api-console/errors): what each failure looks like, for the error-handling tests you can now run for free.
