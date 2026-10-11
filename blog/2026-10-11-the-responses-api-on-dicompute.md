---
title: "The OpenAI Responses API on DiCompute"
description: "How /openai/v1/responses maps to the same completion path, when to choose it over Chat Completions, and how streaming events look."
date: 2026-10-11
authors: [DiCompute team]
tags: [responses-api, openai-compatible, api]
categories: [engineering]
cover: /blog-assets/blog/the-responses-api-on-dicompute/banner.webp
coverAlt: "Duotone editorial illustration: ruled ledger lines crossed by small tally groups, one group picked out in accent; a cyan accent on a deep ink field."
---

OpenAI has pushed the Responses API as its primary interface through 2025
and 2026, and SDK users are migrating to it. DiCompute implements the route,
`POST /openai/v1/responses`, so code written for it can run here with a new
base URL and key. This post shows a minimal request, what the streaming events
look like, and when Chat Completions is still the better choice.

Two honest limits up front. This is a documented subset of the Responses API,
not full parity: there are no hosted tools and no built-in file search, and
several fields are refused. And function calling on this lane has no accepting
model with a tools vouch today (more below). The snippets here were run
against the live API with an invalid key to check that the URL, headers and
body parse, and they show the shape of a call, not a recorded answer.

## Responses versus Chat Completions in one paragraph

Chat Completions takes a `messages` array and returns `choices`. Responses
takes `input` (a string, or an array of typed items) plus optional
`instructions`, and returns an `output` array of items. On DiCompute the two
are the same machinery. According to the
[migration guide](/docs/migration), the Responses route validates the body
against its own shape and then translates it into a chat-completions request,
so every reservation, rate limit and billing rule is the one the native route
already uses. You pay for the same tokens either way, and `/openai/v1/models`
lists the same models.

## A minimal request

With curl:

```bash
curl -sS https://dicompute.ai/openai/v1/responses \
  -H "authorization: Bearer $DICO_KEY" \
  -H 'content-type: application/json' \
  -d '{"model":"qwen2.5-3b-instruct","input":"Say OK.","max_output_tokens":128}'
```

With the official `openai` Python package:

```python
import os
from openai import OpenAI

client = OpenAI(
    base_url="https://dicompute.ai/openai/v1",
    api_key=os.environ["DICO_KEY"],
)

resp = client.responses.create(
    model="qwen2.5-3b-instruct",
    instructions="Answer in one short sentence.",
    input="What is a context window?",
    max_output_tokens=128,
)
print(resp.output_text)
```

The fields map as follows, per the compatibility matrix:

| Responses field | What it becomes |
|---|---|
| `input` (string or item array) | the chat messages |
| `instructions` | a leading system message |
| `max_output_tokens` | `max_tokens`, which sizes the reservation |
| `temperature`, `top_p` | forwarded |
| `text.format` with `json_schema` | `response_format` |

Keep `max_output_tokens` small. `qwen2.5-3b-instruct`, the model that accepts
requests on the direct engine, has a 1,024-token window, and the output cap
is what a request reserves against your balance. Read the model list live
from `/openai/v1/models` instead of hardcoding ids.

Some fields are refused with a `400` rather than ignored. `store: true`
fails, because responses are not persisted. `previous_response_id` fails for
the same reason, so you resend the full conversation in `input` each turn.
`truncation: "auto"` fails, because this deployment never silently trims a
prompt. `reasoning.summary`, and `input_file` or `input_audio` parts, are
refused as well. Other fields, such as `metadata` and `include`, are accepted
and have no effect. Unknown top-level fields return a `400` naming the field.

## Streaming events and the terminal frame

Set `"stream": true` and the route returns server-sent events. The event
sequence is `response.created`, then `response.output_text.delta` for each
chunk of text, then `response.completed`. If the model hit your
`max_output_tokens` cap, the last event is `response.incomplete` instead.

```python
stream = client.responses.create(
    model="qwen2.5-3b-instruct",
    input="Name three fruits.",
    max_output_tokens=128,
    stream=True,
)
for event in stream:
    if event.type == "response.output_text.delta":
        print(event.delta, end="", flush=True)
    elif event.type == "response.incomplete":
        print("\n[cut off by max_output_tokens]")
print()
```

The migration page calls this a documented subset of the real event
taxonomy. There are no `response.content_part.*` events. Any consumer that
reads `output_text` deltas, which the SDK stream helpers do, is covered.
Tool-call streams add the granular `response.output_item.*` and
`response.function_call_arguments.*` events.

The usage numbers, including `cost_uusd` and `cost_usd`, arrive on the
terminal `response.completed` or `response.incomplete` event, after the
charge settles. If an upstream failure hits mid-stream, you get a terminal
error frame in the Responses error shape, never a clean `completed` event
that hides it. Treat any error frame as the end of the stream.

A signed `dico_receipt` rides only on fleet-served responses. The direct
engine, which serves the models you can use today, produces none. Don't build
a flow that expects a receipt on every response.

## Function calls on the wire, and the model-vouch caveat

The route accepts `tools`, `tool_choice` and `parallel_tool_calls`, and
round-trips `function_call` and `function_call_output` items, including
streamed argument deltas. That is protocol support. The thing to check is
whether a model can decide to call a tool at all. Each model's
`capabilities.tools` flag in `/openai/v1/models` is the operator's vouch.
When I checked, the two models with `tools: true` (`llama-3.3-70b-instruct`
and `llama-3.2-90b-vision-instruct`) both had `metadata.can_accept: false`.
So there is no accepting model with a tools vouch today. Request a tool call
from `qwen2.5-3b-instruct` and it is forwarded without error, but nothing
says it will reliably produce a correct call. Test it yourself, and don't
ship an agent loop on it.

```bash
curl -sS https://dicompute.ai/openai/v1/models \
  | jq '.data[] | {id, tools: .capabilities.tools, can_accept: .metadata.can_accept}'
```

## Which agents need this lane

Codex CLI talks to custom providers in the Responses shape, not Chat
Completions, so it needs `wire_api = "responses"` in `~/.codex/config.toml`.
[Coding agents](/docs/coding-agents) has the config. Its own file and shell
tools are function calls, so the tools caveat above applies in full. The
docs label this integration "documented, not yet run".

## When to stay on Chat Completions

- Your code or library already speaks it, and nothing needs a Responses-only
  field. There's no price difference to gain by moving.
- You need a field the Responses table doesn't list, such as `logit_bias`, `top_k`
  or the model-gated `n` and `logprobs`. The chat route lists them. Check the
  migration matrix for what each route accepts.
- You depend on stored responses or `previous_response_id`. Those are refused here.

## Errors

Errors on this lane use the same OpenAI shape as Chat Completions. With a bad
key you get a `401`:

```json
{"error":{"message":"invalid api key","type":"authentication_error","param":null,"code":"invalid_api_key"}}
```

The `openai` SDK raises `AuthenticationError` for it, and a `429` carries
`retry-after` as on the other routes. The
[error reference](/api-console/errors) lists every condition and whether it
costs money.

## Next steps

- [API reference](/api-console): the route and its schema.
- [Migrating from another provider](/docs/migration): the field-by-field table.
- [Coding agents](/docs/coding-agents): Codex CLI and the other clients.
- [Building on the DiCompute API](/blog/building-on-the-dicompute-api): keys, base URL, rate limits.
