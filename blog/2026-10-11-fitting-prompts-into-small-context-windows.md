---
title: "Fitting prompts into small context windows"
description: "Count tokens, trim history, summarise, and budget max_tokens in code so requests fit a small model's window every time."
date: 2026-10-11
authors: [DiCompute team]
tags: [context-window, prompting, api]
categories: [engineering]
cover: /blog-assets/blog/fitting-prompts-into-small-context-windows/banner.webp
coverAlt: "Duotone editorial illustration: ruled ledger lines crossed by small tally groups, one group picked out in accent; a cyan accent on a deep ink field."
---

Small, cheap models with tight context windows became a popular production choice in 2026, and they turn context budgeting from an afterthought into a core skill. The model DiCompute serves directly, `qwen2.5-3b-instruct`, has a 1,024-token window according to `/openai/v1/models`. That is roughly a short page of text for the prompt, the history and the reply combined. This post shows how to stay inside it in code: read the window from the API, estimate tokens, trim history, summarize old turns and choose `max_tokens` on purpose.

The window is a live value, not a constant. Other models in the catalogue list 32,768 and 131,072, but they are served by the provider fleet, which carries traffic for one internal test account only today. Write your code against the feed, and check [/models](/models) for the current state.

## Prompt plus `max_tokens` must fit `context_length`

The rule is one inequality: your prompt tokens plus `max_tokens` must be no larger than the model's window. The API enforces it before routing. A request that breaks it is refused with a `429` and `error.code: "rate_limit_exceeded"`, with a `Retry-After` header, and the message names the model and the limit ([models doc](/docs/models)). The reason is `prompt_exceeds_context` when the prompt alone is too big, and `context_exceeded` when prompt plus `max_tokens` is. Both happen before any reservation, so they cost nothing.

That `429` is easy to misread. It is not a rate limit, and retrying the same request will fail the same way. Shrink the prompt or the `max_tokens`, using the reason to decide which.

## Reading `context_length` from `/openai/v1/models`

The model list is public and needs no key. Ask for a single model:

```bash
curl -sS https://dicompute.ai/openai/v1/models/qwen2.5-3b-instruct | jq '{id, context_length}'
```

When we ran it, that returned `"context_length": 1024`. In Python:

```python
import json
import urllib.request

BASE = "https://dicompute.ai/openai/v1"


def context_length(model: str) -> int:
    # Set a User-Agent: the edge refuses urllib's default one with a 403.
    req = urllib.request.Request(f"{BASE}/models/{model}", headers={"User-Agent": "my-app/1.0"})
    with urllib.request.urlopen(req) as r:
        return json.load(r)["context_length"]
```

Cache the value at startup. A model with no configured window is not gated by this check, so treat a missing field deliberately instead of crashing on it.

## Estimating tokens client-side

You need a count before you send. A tokenizer for the exact model is the accurate way. When you do not have one, a character-based guess works if you bias it high:

```python
def rough_tokens(text: str) -> int:
    # A crude heuristic, not a tokenizer. It deliberately overestimates.
    # Never treat it as an exact count.
    return -(-len(text) // 3)
```

Treat the result as an estimate with a margin, never as a measurement. Chat formatting adds tokens around each message, so keep a safety margin too. The browser tools [token counter](/tools/token-counter) and [context check](/tools/context-check) run on your device, and the text never leaves the page, which makes them handy for calibrating the heuristic on your own prompts. The authoritative number is what the server reports back in `usage`.

```python
def budget(window: int, max_tokens: int, reply_margin: int = 32) -> int:
    """Tokens left for the prompt once the reply and a safety margin are reserved."""
    return window - max_tokens - reply_margin
```

With a 1,024-token window and `max_tokens=128`, that leaves 864 tokens for everything you send.

## Trimming chat history

The simplest strategy keeps the system prompt, then as many of the newest turns as fit:

```python
def trim_history(messages: list[dict], prompt_budget: int) -> list[dict]:
    """Keep the system prompt and as many of the newest turns as fit."""
    system = [m for m in messages if m["role"] == "system"]
    turns = [m for m in messages if m["role"] != "system"]
    used = sum(rough_tokens(m["content"]) for m in system)
    kept: list[dict] = []
    for m in reversed(turns):
        cost = rough_tokens(m["content"])
        if used + cost > prompt_budget:
            break
        kept.append(m)
        used += cost
    return system + kept[::-1]
```

We ran this on a synthetic 41-message history against the live window. It kept the system prompt plus the 8 newest turns, 829 estimated tokens against a budget of 864. Stopping at the first turn that does not fit, instead of skipping it, keeps the kept turns contiguous so the conversation still makes sense.

## Rolling summaries for long sessions

Dropping old turns loses information. A rolling summary spends some budget to keep it: when history overflows, summarize the dropped turns into one short note and put it after the system prompt.

```python
import os
from openai import OpenAI

client = OpenAI(base_url="https://dicompute.ai/openai/v1", api_key=os.environ["DICO_KEY"])


def summarize(old_turns: list[dict]) -> dict:
    """Collapse old turns into one short system note."""
    transcript = "\n".join(f'{m["role"]}: {m["content"]}' for m in old_turns)
    resp = client.chat.completions.create(
        model="qwen2.5-3b-instruct",
        max_tokens=96,
        messages=[
            {"role": "system", "content": "Summarize this conversation in three short sentences."},
            {"role": "user", "content": transcript[-1200:]},  # the summarizer has the same small window
        ],
    )
    return {"role": "system", "content": "Earlier in this chat: " + resp.choices[0].message.content}
```

The summarizer is itself a request with the same window, so truncate its input, as the last line does. Each summary costs a request, and the minimum charge is $0.0001, so summarize in batches rather than per turn. Reserve the summary's size in `prompt_budget` before trimming. We ran this with an invalid key: it raised the SDK's `AuthenticationError` with the standard `401` body, which shows the call shape parses. It has not produced a real summary.

## Choosing `max_tokens` deliberately

`max_tokens` is not just a cap on the reply. A request reserves its worst case, based on `max_tokens`, and settles at actual usage, with the difference refunded ([pricing](/pricing)). A needlessly large `max_tokens` reserves more than you use and counts against the window too. Pick it per call: 128 for a classification or a short answer, more only when you need it. Above a model's output ceiling, the API rejects the request with a `400` instead of clamping it quietly.

## Testing edge cases

Write these tests before you ship:

- A history of only a system prompt, which should come back unchanged.
- A budget so small that no turn fits, which should keep the system prompt and nothing else.
- A single user message larger than the whole budget. Decide whether to truncate it or reject it, because trimming history cannot help.
- A model whose `context_length` is missing.
- The refusal path: send a deliberately oversized prompt and confirm you handle the `429` as "shrink", not "retry later".

Our run of the first two passed. The cheapest end-to-end check is `POST /openai/v1/estimate` for price, and the live `429` for the limit.

## Next steps

- Read the [models doc](/docs/models) for per-model limits and the output ceiling.
- Calibrate your estimator with the [token counter](/tools/token-counter) and [context check](/tools/context-check).
- Read [Building on the DiCompute API](/blog/building-on-the-dicompute-api) for a first request.
- Compare current rates on [/pricing](/pricing) before you choose a model.
