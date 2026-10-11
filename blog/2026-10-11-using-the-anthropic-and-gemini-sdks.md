---
title: "Using the Anthropic and Google GenAI SDKs with DiCompute"
description: "DiCompute also speaks the Anthropic Messages and Gemini generateContent protocols. Base URLs, auth headers and the error shapes to expect."
date: 2026-10-11
authors: [DiCompute team]
tags: [anthropic-sdk, gemini, sdk]
categories: [engineering]
cover: /blog-assets/blog/using-the-anthropic-and-gemini-sdks/banner.webp
coverAlt: "Duotone editorial illustration: ruled ledger lines crossed by small tally groups, one group picked out in accent; a cyan accent on a deep ink field."
---

In 2026, gateways that accept OpenAI, Anthropic and Gemini SDK traffic on one
endpoint became common. DiCompute is one of them. If your app is written
against the Anthropic or Google GenAI SDK, you can point it at DiCompute by
changing a base URL and a key, and leave the rest of your request-building
code alone.

Read the limits first. These are compatible lanes, not copies of the vendors'
APIs. Each one accepts a documented subset of the fields, and refuses the
rest with a `400`. The [compatibility matrix](/docs/migration) lists the
subset, and "full parity" is not something this post claims. The models
behind them are the small open models in DiCompute's catalogue, and the
[integrations page](/integrations/anthropic-sdk) for the Anthropic SDK is
labelled "Documented, not yet run": the protocol is covered by the API's
automated tests, but a live client run with a real key is still pending. The
snippets below were run against the live API with an invalid key, to check
that the URL, headers and body parse. They show the shape of a call, not a
recorded answer.

This post assumes you already have a key from
[/settings/keys](/settings/keys). If not, the
[building on the API guide](/blog/building-on-the-dicompute-api) covers that.

## Three protocols, one account

One account and one key work on every lane. The routes are:

| Protocol | Route |
|---|---|
| OpenAI Chat Completions | `POST /openai/v1/chat/completions` |
| Anthropic Messages | `POST /openai/v1/messages` (plus `/messages/count_tokens`) |
| Gemini | `POST /openai/v1beta/models/{model}:generateContent`, `:streamGenerateContent`, `:countTokens` |

According to the migration page, the Anthropic, Responses and legacy
Completions routes each validate the body against their own reference shape,
then translate it into a chat-completions request. So there is one
reservation and one settlement per request, whichever lane you call, and the
same catalogue, rate limits and key scopes apply to all of them.

## Anthropic SDK: bare `/openai` and your key

The Anthropic SDKs append `/v1/messages` to the base URL themselves. So the
base URL is the bare prefix `https://dicompute.ai/openai`, not
`.../openai/v1`. A base that already ends in `/openai/v1` composes to
`/openai/v1/v1/messages`. I sent a request there with an invalid key, and it
returned the OpenAI-shaped `401`, not the Anthropic-shaped one. If you see an
OpenAI error envelope from an Anthropic client, check the base URL first.

```python
import os
from anthropic import Anthropic

client = Anthropic(
    base_url="https://dicompute.ai/openai",
    api_key=os.environ["DICO_KEY"],
)

msg = client.messages.create(
    model="qwen2.5-3b-instruct",
    max_tokens=128,
    messages=[{"role": "user", "content": "Say OK."}],
)
print(msg.content[0].text)
```

The JavaScript SDK takes the same two settings:

```js
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  baseURL: "https://dicompute.ai/openai",
  apiKey: process.env.DICO_KEY,
});

const msg = await client.messages.create({
  model: "qwen2.5-3b-instruct",
  max_tokens: 128,
  messages: [{ role: "user", content: "Say OK." }],
});
console.log(msg.content);
```

Auth is where the docs need a careful read. The migration page says the SDK's
default `x-api-key` header works on this route, and that
`Authorization: Bearer` is also accepted, so one header can serve every
protocol. The Anthropic SDK integration page tells JavaScript users to pass
`authToken` instead of `apiKey`. The same page notes that Claude
Code specifically sends its key as a Bearer token through
`ANTHROPIC_AUTH_TOKEN`. If one form fails for you, try the other.

Anthropic requests need `max_tokens`. Keep it small on
`qwen2.5-3b-instruct`, whose window is 1,024 tokens (see below).

## `count_tokens` for Anthropic-shaped requests

The SDK's `client.messages.count_tokens(...)` calls
`POST /openai/v1/messages/count_tokens` and returns `input_tokens`:

```python
n = client.messages.count_tokens(
    model="qwen2.5-3b-instruct",
    messages=[{"role": "user", "content": "Say OK."}],
)
print(n.input_tokens)
```

Treat the number as an estimate. A word of caution from my own check: this
route answered `200` when I called it with an invalid key, so do not use it as
an auth check. Use a real completion, or a `401` test on `/messages`, for
that.

## Google GenAI SDK: the `v1beta` routes

The public host serves `/openai/v1beta/models/{model}:generateContent`,
`:streamGenerateContent` and `:countTokens`. The `google-genai` SDK appends
`/v1beta/...` to its base URL, so the base is again the bare
`https://dicompute.ai/openai`:

```python
import os
from google import genai

client = genai.Client(
    api_key=os.environ["DICO_KEY"],
    http_options={"base_url": "https://dicompute.ai/openai"},
)

resp = client.models.generate_content(
    model="qwen2.5-3b-instruct",
    contents="Say OK.",
    config={"max_output_tokens": 128},
)
print(resp.text)
```

The SDK sends your key as `x-goog-api-key`. `Authorization: Bearer` also
works. Per the migration page, `?key=` in the URL is rejected on purpose,
because URLs end up in access logs. Responses carry `candidates[]` and
`usageMetadata`, and streaming uses `:streamGenerateContent?alt=sse`.
`:countTokens` is an estimate and needs a key.

The matrix lists what the Gemini lane forwards: text and image parts,
`systemInstruction`, the main `generationConfig` fields, JSON-schema output
and function declarations. `safetySettings`, `candidateCount` above 1 and
non-image `inlineData` are refused with a Gemini-shaped `INVALID_ARGUMENT`.

## What a 401 looks like on each lane

Send each lane a deliberately wrong key (`sk-dico-invalid-example`) as a
setup check. These are the bodies I got back, all with status `401`:

```text
OpenAI lanes:
{"error":{"message":"invalid api key","type":"authentication_error","param":null,"code":"invalid_api_key"}}

Anthropic lane, POST /openai/v1/messages:
{"type":"error","error":{"type":"authentication_error","message":"invalid api key"}}

Gemini lane:
{"error":{"code":401,"message":"invalid api key","status":"UNAUTHENTICATED"}}
```

Each SDK raises its own usual authentication error for its own envelope.
`anthropic.AuthenticationError` carries the Anthropic body, and the
`google-genai` `APIError` has `code` 401 and status `UNAUTHENTICATED`. Every
response also has an `x-request-id` header. Log it.

## Picking a model id

Use ids from the one shared catalogue, and read it live instead of hardcoding:

```bash
curl -sS https://dicompute.ai/openai/v1/models \
  | jq -r '.data[] | select(.metadata.can_accept) | .id'
```

On 2026-10-11 the catalogue listed five models. Three had
`metadata.can_accept: true`. Of those, `qwen2.5-3b-instruct` is the one that
runs on the direct engine, and its `context_length` is 1,024 tokens, so the
examples above use short prompts and a small output cap. Check
[/models](/models) and [/pricing](/pricing) for the current list, since both
change. The fleet-served models are not something to build on yet: the fleet
carries traffic for one internal test account only.

The compatible lanes do not add models. A Gemini-shaped request names the same
ids as an OpenAI-shaped one.

## Server-side only

Authenticated routes send no CORS headers, and `OPTIONS` returns `405`. Make
these calls from your own server, never from browser code.

## Where the compatibility matrix lives

The [migration guide](/docs/migration) has the one-line change per client and
a field-by-field table per lane: forwarded, accepted but ignored, or refused.
Refused fields return `400` instead of being silently dropped, so an
unsupported option shows up in development. Unknown top-level fields are
rejected the same way.

## Next steps

- [Migrating from another provider](/docs/migration): the full compatibility matrix.
- [Anthropic SDK integration](/integrations/anthropic-sdk): the status of the Anthropic SDK entry.
- [API reference](/api-console): every route, with an error reference at [/api-console/errors](/api-console/errors).
- [Building on the DiCompute API](/blog/building-on-the-dicompute-api): keys, streaming, rate limits.
