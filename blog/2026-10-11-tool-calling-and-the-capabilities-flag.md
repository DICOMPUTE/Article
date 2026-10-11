---
title: "Tool calling on open models, and the capabilities flag"
description: "DiCompute forwards tools end to end, but a model must be vouched for to rely on it. How to read capabilities.tools and test a model yourself."
date: 2026-10-11
authors: [DiCompute team]
tags: [tool-calling, models, agents]
categories: [engineering]
cover: /blog-assets/blog/tool-calling-and-the-capabilities-flag/banner.webp
coverAlt: "Duotone editorial illustration: ruled ledger lines crossed by small tally groups, one group picked out in accent; a cyan accent on a deep ink field."
---

Agents live or die on tool calling. You describe functions to the model, the model answers with a structured request to call one, your code runs it and sends the result back. Through 2026 that loop, running on open-weight models, became a central developer topic. It is also where small models are least predictable.

The honest status on DiCompute today: the API carries tool calls correctly, but no model that is accepting requests right now carries the operator's "tools" vouch. The two models that do carry it are not accepting traffic at the moment. So this post is about reading the flag, testing a model yourself, and building agents that survive a model that does not call tools. It is not a promise that tool calling works on `qwen2.5-3b-instruct`.

## Why agents depend on tool calling

An agent loop is: model proposes an action, your code executes it, the result goes back, repeat. If the model cannot reliably emit a well-formed call, the loop has nothing to execute. Frameworks hide this, but they all depend on it. Small, heavily quantized models tend to be the first to produce a call with a missing argument, a wrong name, or a prose answer where a call was expected.

## Protocol support versus model vouch

Two different questions get mixed up here.

**Does the API carry tool calls?** Yes, on all three wire shapes, according to [coding agents](/docs/coding-agents):

- OpenAI Chat Completions: `tools`, `tool_choice` and `parallel_tool_calls` are forwarded to the upstream engine, and the `tool_calls` field in the response round-trips, streamed or not.
- Anthropic Messages (`/openai/v1/messages`): a full `tool_use` then `tool_result` loop round-trips.
- OpenAI Responses (`/openai/v1/responses`): the equivalent `function_call` and `function_call_output` shapes round-trip, including streamed argument deltas.

**Will a given model produce a correct call?** That depends on the model and its engine, and the API cannot know. Instead, each model entry has a flag, `capabilities.tools`, set by the operator. It is an explicit vouch that someone checked the model's engine end to end for tool calling. `false` does not block a request. A request with `tools` against a `tools: false` model is forwarded anyway. The flag says nobody has checked it, and what a 3B model does with a tool schema is unknown.

## Reading the flag live

The model list is public, so you can read the vouch without a key:

```bash
curl -sS https://dicompute.ai/openai/v1/models \
  | jq '.data[] | {id, tools: .capabilities.tools, can_accept: .metadata.can_accept}'
```

Do not hardcode the answer. The [models doc](/docs/models) tells you to query the feed, because the flag changes independently of any page.

## Today's catalogue

As of this post, the feed reports:

| Model | `capabilities.tools` | `metadata.can_accept` |
|---|---|---|
| `qwen2.5-3b-instruct` | false | true |
| `qwen2.5-0.5b-instruct` | false | true |
| `ternary-bonsai-2-27b` | false | true |
| `llama-3.3-70b-instruct` | true | false |
| `llama-3.2-90b-vision-instruct` | true | false |

The two vouched models are the ones that cannot take your request right now. That combination is why this post does not tell you to build on tool calling today. Check [/models](/models) for the current state before you design around it.

## Testing a model yourself

The test is one request with one tool. This one asks the model to look up weather and gives it a `get_weather` function:

```python
import json
import os
from openai import OpenAI

client = OpenAI(base_url="https://dicompute.ai/openai/v1", api_key=os.environ["DICO_KEY"])

tools = [{
    "type": "function",
    "function": {
        "name": "get_weather",
        "description": "Get current weather for a city",
        "parameters": {
            "type": "object",
            "properties": {"city": {"type": "string"}},
            "required": ["city"],
        },
    },
}]

resp = client.chat.completions.create(
    model="qwen2.5-3b-instruct",
    messages=[{"role": "user", "content": "What is the weather in SF? Use the tool."}],
    tools=tools,
    max_tokens=128,
)
choice = resp.choices[0]
print(choice.finish_reason)
print(choice.message.tool_calls or choice.message.content)
```

Keep the prompt short. This model's window is 1,024 tokens, and the tool schema counts against it. To check that your setup reaches the server, send the same request with a key that is obviously wrong. You get the standard `401` body, `{"error":{"message":"invalid api key","type":"authentication_error", ...}}`, and the SDK raises `AuthenticationError`. That proves the URL, headers and tool schema parse. It tells you nothing about the model's behavior, which needs a real key and a balance. [API keys](/docs/api-keys) covers creating a key, and the [API console](/api-console) lets you try requests.

Run the test ten times, not once. A single success on a small model means little.

## `finish_reason: tool_calls` versus plain text

Read the result three ways:

- **`finish_reason` is `tool_calls` and `message.tool_calls` is populated.** The model chose to call. Next, check the call itself: is the function name one you defined, does `arguments` parse as JSON, does it match your schema?
- **`finish_reason` is `stop` and `message.content` has text.** The model ignored the tool and answered in prose. On a model without the vouch this is a normal outcome, not an API bug.
- **`tool_calls` is populated but `arguments` is broken JSON or missing required fields.** The model tried and failed. Count how often.

Your pass rate over many runs, on the prompts you really use, is the number that matters. The flag only tells you whether anyone else has checked.

## Designing agents that degrade gracefully

- **Validate every call before you run it.** Parse `arguments`, check required fields, and reject names you did not define. Never pass model output to a shell or a database unchecked.
- **Allow a retry with feedback.** Send back a `tool` message saying what was wrong, once or twice, then stop.
- **Have a no-tools path.** If the model answers in text, treat that as a valid reply, or ask for a JSON answer in the prompt and parse it yourself.
- **Select the model from the feed.** At startup, read `capabilities.tools` and `metadata.can_accept`, and refuse to run the tool loop when no model qualifies, with a clear message.
- **Cap the loop.** A maximum step count and a `max_tokens` ceiling keep a confused model from burning your balance.
- **Keep tool results short.** Every result goes back into a window that may be 1,024 tokens.

## Next steps

- Read [coding agents](/docs/coding-agents) for the tool-calling section that this post summarizes.
- Read the [models doc](/docs/models) for the fields on each model entry.
- Try requests in the [API console](/api-console).
- Start with [Building on the DiCompute API](/blog/building-on-the-dicompute-api) for the base URL and a first request.
