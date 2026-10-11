---
title: "Moving an OpenAI app to DiCompute"
description: "A drop-in migration checklist: change the base URL and key, then audit models, streaming, errors and the fields that differ."
date: 2026-10-11
authors: [DiCompute team]
tags: [openai-compatible, migration, sdk]
categories: [engineering]
cover: /blog-assets/blog/moving-an-openai-app-to-dicompute/banner.webp
coverAlt: "Duotone editorial illustration: ruled ledger lines crossed by small tally groups, one group picked out in accent; a cyan accent on a deep ink field."
---

Through 2026, more teams moved off single-vendor APIs and onto OpenAI-compatible providers that serve open models. The pitch is less lock-in: if the wire format is the same, switching is a configuration change. DiCompute speaks that format, so for most apps the move really is two lines. The rest of the work is an audit, and that is what this post is about.

It's for developers who already have an app on the OpenAI Chat Completions API. Here is the honest status first. DiCompute serves a small catalogue of open-weight models, not OpenAI's. The one model that accepts requests through the direct engine today, `qwen2.5-3b-instruct`, has a context window of only 1,024 tokens. Tool calling, vision, embeddings, image generation and knowledge bases are not usable today, and the sections below say how to find that out for yourself instead of taking this post's word for it.

## 1. The two-line change

In Python, with the `openai` package:

```python
import os
from openai import OpenAI

client = OpenAI(
    base_url="https://dicompute.ai/openai/v1",   # was https://api.openai.com/v1
    api_key=os.environ["DICO_KEY"],              # was your OpenAI key
)
```

In JavaScript, as an ES module:

```js
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://dicompute.ai/openai/v1",
  apiKey: process.env.DICO_KEY,
});
```

Create the key at [/settings/keys](/settings/keys) after signing in. It starts with `sk-dico-` and is shown once. Read it from an environment variable, as above, and never commit it. The [migration guide](/docs/migration) has the same diff for the Anthropic and Gemini SDKs and for plain `curl`.

## 2. Model ids: look them up, don't paste them

Your code probably names an OpenAI model. That id means nothing here. Ask the catalogue, which is public and needs no key:

```bash
curl -sS https://dicompute.ai/openai/v1/models \
  | jq -r '.data[] | select(.metadata.can_accept) | .id'
```

Each entry has `id`, `pricing` (integer micro-USD per million tokens), `context_length`, a `capabilities` object, and `metadata.can_accept`. A model can be listed while nothing is serving it, so filter on `can_accept`. At the time of writing the feed lists five models and three of them accept requests. That will change, so read the feed rather than this sentence. The [models doc](/docs/models) describes every field, and [/pricing](/pricing) shows the same catalogue as a table. Prices come from the catalogue and can change, so don't copy them into your code. Move the model id into configuration, and resolve it at startup or per request.

## 3. Context limits: size your prompts

OpenAI-sized prompts won't fit everywhere. `qwen2.5-3b-instruct` reports `context_length: 1024`. Two other accepting models report 32,768. Before you send, count roughly and compare against the model's own `context_length`. The browser-only [token counter](/tools/token-counter) and [context check](/tools/context-check) help while you're sizing prompts by hand. Also set `max_tokens` explicitly. A request reserves its worst case up front, based on your maximum output tokens, and settles at actual usage, so a small cap keeps the reservation small too.

## 4. Features to audit

Don't assume a parameter works because the SDK lets you type it. The migration doc's compatibility matrix sorts each field into forwarded, accepted-but-no-op, and refused with a `400`. The principle is worth repeating: a parameter the API can't honor is refused by name, not silently dropped.

| You use | What to check |
|---|---|
| Tool calling | The fields are forwarded, but the two models with `capabilities.tools: true` have `can_accept: false` right now. Treat tools as not usable until the catalogue says otherwise. |
| Vision | Same story: the vision-capable model isn't accepting requests today. |
| Embeddings, rerank | The routes exist, but no model serves them. Don't build on them yet. |
| Image generation, audio | No model is configured for them. |
| Managed retrieval (`knowledge_base_id`) | Built, waiting for an embedding model. |
| `n` above 1 | Model-gated, and refused with a `400` for models that don't declare support. |
| `store: true`, unusual `service_tier`, non-text `modalities` | Refused with a `400`. |

Not every OpenAI parameter is supported, so run your real request shapes through the smoke test in section 7 and read the `400` bodies you get back.

## 5. Errors: the same shapes, plus two headers

Errors use the OpenAI shape, so the SDK raises its usual exceptions. A bad key is the `AuthenticationError` you know. Two additions are worth wiring into your logging and retry code:

- `x-request-id`: every response, success or error, carries `req_<uuid>`. Log it. It is the handle for any dispute about a request.
- `x-ratelimit-scope`: a `429` names which ceiling refused you. Branch on this header, not on message text, because `error.code` is coarser than `error.message`. A `429` also carries `retry-after`, in whole seconds.

Two more rules matter for migrations. A `402 insufficient_quota` means balance or a spend cap, so never retry it on a timer. And a refusal before the reservation costs nothing. The [error reference](/api-console/errors) lists every condition with its meaning, fix, retry advice and billing effect, and the [rate-limits page](/docs/rate-limits) lists the scopes.

## 6. Server-side only

If your OpenAI app calls the API from the browser, that has to change. Authenticated routes send no CORS headers, and a preflight `OPTIONS` gets a `405`. This is deliberate: a live key should never reach front-end code. Put a small proxy on your own server and keep the key in its environment. Only the public read feeds, such as `/openai/v1/models` and `/openai/v1/pricing`, allow cross-origin `GET`.

## 7. A smoke test with an invalid key

Before you spend anything, prove the wiring. Send one request with a key that is obviously wrong. You should get a `401` and the OpenAI SDK should raise `AuthenticationError`:

```python
import openai
from openai import OpenAI

client = OpenAI(base_url="https://dicompute.ai/openai/v1", api_key="sk-dico-invalid-example")

try:
    client.chat.completions.create(
        model="qwen2.5-3b-instruct",
        messages=[{"role": "user", "content": "say OK"}],
        max_tokens=16,
    )
except openai.AuthenticationError as e:
    print("wiring ok:", e.status_code, e.response.headers.get("x-request-id"))
```

The raw body is `{"error":{"message":"invalid api key","type":"authentication_error","param":null,"code":"invalid_api_key"}}`. If you see that, the URL, method, headers and body all parsed. Then run your real request shapes with a real key and a short prompt.

## Next steps

- [Migrating from another provider](/docs/migration): the per-SDK diff and the full compatibility matrix.
- [Models](/docs/models): every catalogue field and what it means.
- [Errors](/api-console/errors): the full condition list, with retry and billing rules.
- [Building on the DiCompute API](/blog/building-on-the-dicompute-api): the end-to-end walkthrough, from key to streaming response.
