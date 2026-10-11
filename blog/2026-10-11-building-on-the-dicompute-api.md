---
title: "Building on the DiCompute API"
description: "From a fresh key to a streaming chat completion in your own app: the OpenAI-compatible base URL, working curl, Python and JavaScript examples, choosing a model, and handling rate limits and errors."
date: 2026-10-11
authors: [DiCompute team]
tags: [guides, api, openai-compatible]
categories: [engineering]
cover: /blog-assets/blog/building-on-the-dicompute-api/banner.webp
coverAlt: "Duotone editorial illustration: ruled ledger lines crossed by small tally groups, one group picked out in accent; a cyan accent on a deep ink field."
---

DiCompute's API is OpenAI-compatible. If your app already talks to the OpenAI
Chat Completions API, you change two things, the base URL and the key, and
the rest of your code stays as it is. This post goes from no account to a
streaming response, then covers the parts a production integration needs:
choosing a model, rate limits, errors and where the full reference lives.
Everything here follows the [quickstart](/docs/quickstart).

## 1. Get a key

1. Sign in at [dicompute.ai/login](/login). Your account is created the first
   time you sign in.
2. Open [/settings/keys](/settings/keys) and create a key. You may be asked to
   confirm your sign-in once more first.
3. Copy the key (it starts with `sk-dico-`) straight away. **It is shown
   once.** If you lose it, the same page has a "Lost your API key" flow. That
   flow re-verifies you and issues a replacement, which is also shown only
   once.

Keep the key out of your source code. The examples below read it from an
environment variable:

```bash
export DICO_KEY="sk-dico-..."   # your key; never commit it
```

[API keys](/docs/api-keys) covers scopes, per-key spend caps, expiry and
rotation. [Authentication](/docs/authentication) covers the header format and
revoking a key.

## 2. The base URL

```
https://dicompute.ai/openai/v1
```

Send every request there with `Authorization: Bearer $DICO_KEY`.

## 3. A first request

With curl, streaming:

```bash
curl -sS -N https://dicompute.ai/openai/v1/chat/completions \
  -H "authorization: Bearer $DICO_KEY" \
  -H 'content-type: application/json' \
  -d '{"model":"qwen2.5-3b-instruct","messages":[{"role":"user","content":"say OK"}],"stream":true}'
```

Leave out `"stream": true` and you get one normal chat-completion object
instead of a stream.

To check your setup, send the same request with a key that is obviously
wrong. You should get a `401` with this body:

```json
{"error":{"message":"invalid api key","type":"authentication_error","param":null,"code":"invalid_api_key"}}
```

That's the OpenAI error shape, so an OpenAI SDK raises its usual
`AuthenticationError` for it.

### Python

With the official `openai` package (`pip install openai`):

```python
import os
from openai import OpenAI

client = OpenAI(
    base_url="https://dicompute.ai/openai/v1",
    api_key=os.environ["DICO_KEY"],
)

stream = client.chat.completions.create(
    model="qwen2.5-3b-instruct",
    messages=[{"role": "user", "content": "Write a haiku about autumn."}],
    stream=True,
)
for chunk in stream:
    if chunk.choices:
        print(chunk.choices[0].delta.content or "", end="", flush=True)
print()
```

### JavaScript

With the official `openai` package (`npm install openai`), as an ES module:

```js
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://dicompute.ai/openai/v1",
  apiKey: process.env.DICO_KEY,
});

const completion = await client.chat.completions.create({
  model: "qwen2.5-3b-instruct",
  messages: [{ role: "user", content: "Give me three names for a cat." }],
});

console.log(completion.choices[0].message.content);
```

DiCompute also has a TypeScript SDK of its own, but it isn't on npm yet. The
quickstart says so plainly. Use the OpenAI SDK, as above, until it is.

## 4. Choosing a model

Don't hardcode a model id and assume it will always be there. Which models a
deployment serves is configuration, not a contract. Ask the API:

```bash
curl -sS https://dicompute.ai/openai/v1/models | jq -r '.data[].id'
```

The response is OpenAI's list shape, plus a few extra fields on each entry
that are worth reading:

- `pricing`: input and output rates per million tokens, in integer micro-USD
  (µUSD, where 1 µUSD is $0.000001).
- `context_length`: the model's window, when the operator has set it. Use it
  to size a prompt before you send it.
- `capabilities`: whether the model supports tools, vision and so on.
- `metadata.can_accept`: whether the model can take a request right now. This
  one matters. A model can be in the catalogue while nothing is serving it.

To filter on that last field:

```bash
curl -sS https://dicompute.ai/openai/v1/models \
  | jq -r '.data[] | select(.metadata.can_accept) | .id'
```

[Models](/docs/models) documents every field. [/pricing](/pricing) shows the
same catalogue in a readable table, and there's a cost-estimate endpoint in
the [API reference](/api-console) if you want a price before you send a
request.

## 5. How billing works on each request

Each request first reserves its worst-case cost, based on your maximum output
tokens. When it finishes, it settles at what it actually used, and the
difference is refunded straight away. There's a minimum charge of $0.0001 per
request. Charges are recorded in integer µUSD, never rounded credit packs.
The [pricing page](/pricing) and [billing](/docs/billing) explain this in
full. To fund an account, use Settings → Billing → Add credit in the console.
The same Stripe checkout is also available over the API, as the billing guide
describes.

## 6. Rate limits and errors

A rate-limited request gets a `429` with three things you can rely on:

```
HTTP/1.1 429 Too Many Requests
retry-after: 4
x-ratelimit-scope: account_requests
```

```json
{ "error": { "message": "account_requests", "type": "rate_limit_error", "code": "rate_limit_exceeded" } }
```

- `retry-after` is in whole seconds. Wait at least that long.
- `x-ratelimit-scope` says which ceiling refused you: your account's request,
  token or concurrency limit, one key's own override, and so on. Branch on
  this header, not on the message text.
- An `at_capacity` 429 means the whole deployment is full at that moment. It
  has `retry-after` but no scope header.

Successful authenticated responses also send `x-ratelimit-limit`,
`x-ratelimit-remaining` and `x-ratelimit-reset`, so you can slow down before
you ever hit a 429. [Rate limits](/docs/rate-limits) lists every scope.

In Python, the SDK maps these to its normal exception types:

```python
import openai

try:
    resp = client.chat.completions.create(
        model="qwen2.5-3b-instruct",
        messages=[{"role": "user", "content": "say OK"}],
    )
    print(resp.choices[0].message.content)
except openai.RateLimitError as e:
    print("slow down; retry after", e.response.headers.get("retry-after"), "s")
except openai.APIStatusError as e:
    print(e.status_code, e.response.headers.get("x-request-id"), e.body)
```

Every response, success or error, carries an `x-request-id` header. Log it.
If you contact support about a request, it's the first thing they'll ask for.

## 7. One thing to know before you send real data

Requests travel over TLS. The end-to-end encrypted lane, which would also
keep prompts unreadable to the infrastructure operator, is built but not yet
switched on. Every response says which state it's in with an
`x-dico-sealed: true|false` header, and today it reads `false`. Until that
changes, don't send secrets, personal data or proprietary code you wouldn't
show the operator. [/trust](/trust) describes how data is handled.

## Where the docs live

- [/docs](/docs): every guide, starting with the [quickstart](/docs/quickstart).
- [/api-console](/api-console): the interactive API reference.
- `/openai/v1/openapi.json`: the OpenAPI 3.1 spec, for generating your own
  client. `/openapi.json` redirects there.
- [/changelog](/changelog): every partner-visible API change, with an RSS
  feed. Subscribe to it if you build on this surface.

If you're moving an existing integration, [migrating from another
provider](/docs/migration) and [connecting an app framework](/docs/frameworks)
cover the common cases.
