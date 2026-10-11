---
title: "Choosing a model at runtime"
description: "Don't hardcode a model id. Read the catalogue, filter on can_accept, context and capabilities, and fall back gracefully."
date: 2026-10-11
authors: [DiCompute team]
tags: [models, reliability, api]
categories: [engineering]
cover: /blog-assets/blog/choosing-a-model-at-runtime/banner.webp
coverAlt: "Duotone editorial illustration: ruled ledger lines crossed by small tally groups, one group picked out in accent; a cyan accent on a deep ink field."
---

Multi-model routing and fallback became standard architecture for LLM apps in 2026. The reason is practical: catalogues change. Models are added, retired and repriced, and a model that is listed isn't always taking requests. An app with a model id baked into its source has to be redeployed every time any of that happens.

This post builds a small selection function from DiCompute's public feeds. It goes deeper than the model section of the [API guide](/blog/building-on-the-dicompute-api). It is for developers who want their app to ask the platform what it can do today and degrade gracefully when the answer changes. The code reads only public, keyless endpoints, and every feed field below was read live while writing. The model ids and numbers in the examples are a snapshot, not a promise.

## 1. Why hardcoded model ids break

A hardcoded id fails in three ways. The model may be removed. It may be listed but not accepting requests right now. Or your needs may change: a longer prompt needs a larger context window than the model you picked. The [models doc](/docs/models) is explicit that which models a deployment serves is configuration, not a contract. Don't hardcode an id and assume it will always be there, and don't assume any model will stay in the catalogue.

## 2. The fields that matter

`GET https://dicompute.ai/openai/v1/models` is public and keyless. Each entry has:

- `id`: what you pass as `model`.
- `pricing`: `input_uusd_per_mtok` and `output_uusd_per_mtok`, integer micro-USD per million tokens.
- `context_length`: the window in tokens. The field is omitted when it is unconfigured, so test for absence, don't assume a number.
- `capabilities`: declared booleans such as `tools` and `vision`. `false` means "not declared", not "unknown".
- `metadata.can_accept`: whether the model can take a request right now.
- `fleet_served`: present and `true` on models served by the worker fleet, omitted otherwise.
- `deprecated_at`: an ISO timestamp, omitted when the model isn't deprecated.

The [model feeds page](/docs/model-feeds) maps these fields against the other two public model feeds. `can_accept` is the one that most often surprises people. At the time of writing, the two models with `tools: true` report `can_accept: false`, so "supports tools" and "can take a tool request" are different questions.

One more honesty note. Models flagged `fleet_served` run on the worker fleet, which carries real traffic for one internal test account only today. So the function below excludes them by default and makes you opt in. Look at `can_accept` and [/models](/models) before relying on any fleet model.

## 3. Filtering by capability and context

Context is the filter with the sharpest edges. At the time of writing, the model that serves through the direct engine has a 1,024-token window, and the others report 32,768 or more. Compute the size of your prompt, add your `max_tokens`, and require a model whose `context_length` covers both. Treat a missing `context_length` as too small, since you can't prove it fits.

## 4. Live capacity

A model entry says what a model is. `GET /openai/v1/models/capacity` says how busy it is, per model: `can_accept`, `workers`, `workers_healthy`, `queued_requests`, `queue_limit` and a few more. It's public too. Use it as a second check just before choosing: skip a model whose queue is already at its limit. Don't read more into the other numbers than the feed states, and don't quote them. They describe the moment, and the feed is cached for about 30 seconds.

## 5. Planned changes

`GET /openai/v1/models/lifecycle` lists scheduled deprecations, completed ones and price changes, and states the notice period for price increases: 24 hours. The [lifecycle page](/models/lifecycle) shows the same data. At the time of writing every list in it is empty. A 24-hour notice is short, so don't discover a price change from your invoice. Poll this feed, or alert on a non-empty `scheduled` or `price_changes`, and re-check [/pricing](/pricing) when it changes.

## 6. A selection function with a fallback order

This code fetches the catalogue with an ETag revalidation, filters it, ranks it, and returns a list: the first entry is your choice and the rest are your fallback order. Ranking puts your preferred ids first and then the cheapest by combined input and output price:

```python
import time

import httpx

BASE = "https://dicompute.ai/openai/v1"


class Catalogue:
    """The models feed, revalidated with its ETag instead of re-downloaded."""

    def __init__(self, ttl=30):
        self.ttl, self.etag, self.models, self.fetched = ttl, None, [], 0.0

    def get(self):
        if self.models and time.monotonic() - self.fetched < self.ttl:
            return self.models
        headers = {"if-none-match": self.etag} if self.etag else {}
        r = httpx.get(f"{BASE}/models", headers=headers, timeout=10)
        if r.status_code == 304:
            self.fetched = time.monotonic()
            return self.models
        r.raise_for_status()
        self.etag = r.headers.get("etag")
        self.models = r.json()["data"]
        self.fetched = time.monotonic()
        return self.models


def live_capacity():
    r = httpx.get(f"{BASE}/models/capacity", timeout=10)
    r.raise_for_status()
    return {row["id"]: row for row in r.json()["data"]}


def candidates(models, *, min_context=0, need_tools=False, need_vision=False,
               allow_fleet=False, prefer=()):
    """Accepting models that meet the requirements, best first."""
    capacity = live_capacity()
    ok = []
    for m in models:
        caps = m.get("capabilities", {})
        cap = capacity.get(m["id"], {})
        if not m.get("metadata", {}).get("can_accept"):
            continue
        if not cap.get("can_accept", True) or cap.get("queued_requests", 0) >= cap.get("queue_limit", 1):
            continue
        if m.get("deprecated_at"):
            continue
        if m.get("fleet_served") and not allow_fleet:
            continue  # opt in to fleet-served models explicitly
        if (m.get("context_length") or 0) < min_context:
            continue  # unknown context counts as too small
        if need_tools and not caps.get("tools"):
            continue
        if need_vision and not caps.get("vision"):
            continue
        ok.append(m)

    def rank(m):
        pref = prefer.index(m["id"]) if m["id"] in prefer else len(prefer)
        price = m["pricing"]["input_uusd_per_mtok"] + m["pricing"]["output_uusd_per_mtok"]
        return (pref, price)

    return sorted(ok, key=rank)


def pick_model(catalogue, **needs):
    found = candidates(catalogue.get(), **needs)
    if not found:
        raise RuntimeError(f"no accepting model meets {needs}")
    return [m["id"] for m in found]  # first is the choice, the rest are your fallback order
```

Using it:

```python
catalogue = Catalogue()
models = pick_model(catalogue, min_context=800)    # short prompts: direct engine is fine
print(models)  # e.g. ['qwen2.5-3b-instruct'] at the time of writing

try:
    pick_model(catalogue, need_tools=True)
except RuntimeError as e:
    print(e)   # today: no accepting model has the tools vouch
```

Run against the live feeds while writing this post, the first call returned a single model, `qwen2.5-3b-instruct`. A tools request returned the "no accepting model" error, which is exactly the right outcome today. A failure you can see at startup beats a tool call that quietly never happens.

When the function returns more than one id, try the next one if a request fails with a capacity-shaped error. The chat completions route also accepts a `models` array, a DiCompute extension documented in the [migration guide's compatibility matrix](/docs/migration), that is tried in order and only after a `no_worker_for_model` rejection. Check that page before relying on it.

## 7. Caching without going stale

The cache above does two things. It skips the network for 30 seconds. After that it sends `If-None-Match`, and an unchanged feed answers `304` with no body. That matches the feeds' own behavior: the capacity, lifecycle and pricing feeds send `cache-control: public, max-age=30` and a weak `ETag`, while `/openai/v1/models` sends `private, no-cache` with an `ETag`, so always revalidate it. The models feed also sits under a per-IP public-read limit, and authenticating doesn't raise it, so a long-lived cache protects you from a `429` there too. Don't cache for much longer than the feeds do. A model that stopped accepting requests a minute ago shouldn't still be your first choice.

## Next steps

- [Models](/docs/models): every field of the catalogue.
- [Model feeds](/docs/model-feeds): the three feeds and how their fields map.
- [Model lifecycle](/models/lifecycle): scheduled deprecations and price changes.
- [Building on the DiCompute API](/blog/building-on-the-dicompute-api): the shorter model section and the rest of the integration.
