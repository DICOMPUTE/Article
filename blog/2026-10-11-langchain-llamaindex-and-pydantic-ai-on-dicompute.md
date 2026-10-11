---
title: "LangChain, LlamaIndex and Pydantic AI on DiCompute"
description: "Point the popular Python agent and RAG frameworks at DiCompute's OpenAI-compatible endpoint, and know where tools and embeddings stand."
date: 2026-10-11
authors: [DiCompute team]
tags: [frameworks, langchain, python]
categories: [engineering]
cover: /blog-assets/blog/langchain-llamaindex-and-pydantic-ai-on-dicompute/banner.webp
coverAlt: "Duotone editorial illustration: ruled ledger lines crossed by small tally groups, one group picked out in accent; a cyan accent on a deep ink field."
---

LangChain, LlamaIndex and Pydantic AI were still the default ways to build LLM apps in Python through 2026. All three can talk to any OpenAI-compatible server, which means pointing them at DiCompute is a configuration change, not a new integration. This post gives the three snippets, explains what each parameter does, and is blunt about the two places where a framework will outrun what the platform offers today.

The status, up front. The three [integration pages](/integrations) are labelled "Documented, not yet run": nobody has run a completion through each framework with a real key. Tool calling needs a model with the operator's tools vouch, and the two models that have it are not accepting requests right now. No embedding model is served at all. Plain chat generation is the part that works as documented.

## Why frameworks just need a base URL

DiCompute exposes the OpenAI Chat Completions shape at `https://dicompute.ai/openai/v1`. Every framework below wraps the official `openai` Python client, and that client takes a base URL and a key. The [frameworks doc](/docs/frameworks) calls this "config, not code": no DiCompute-specific package exists for any of them.

Three habits carry across all three:

- Read the key from the environment. Examples write it as `sk-dico-...` and never contain a real one.
- Use `qwen2.5-3b-instruct`, the model the direct engine serves. Its context window is 1,024 tokens, so set a small `max_tokens`.
- Call from your server. Authenticated routes send no CORS headers, so a browser cannot call them.

You also no longer need a `User-Agent` override. An edge rule once blocked the OpenAI SDK's default user agent. The frameworks doc says it was lifted on 2026-09-15 and re-checked with the SDK user agents on 2026-09-27. Plain `urllib` scripts without a user agent still get a `403` from the edge, so set one there.

```bash
export DICO_API_KEY="sk-dico-..."   # your key; never commit it
pip install langchain-openai llama-index-llms-openai-like "pydantic-ai-slim[openai]"
```

## LangChain: `ChatOpenAI` with `base_url`

```python
import os
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(
    base_url="https://dicompute.ai/openai/v1",
    api_key=os.environ["DICO_API_KEY"],
    model="qwen2.5-3b-instruct",
    max_tokens=128,
)
print(llm.invoke("say OK").content)
```

`base_url` redirects the underlying client, and `max_tokens` keeps prompt plus reply inside the 1,024-token window. Everything built on `llm`, such as chains and runnables, works the usual way. See the [LangChain page](/integrations/langchain).

## LlamaIndex: `OpenAILike`

LlamaIndex's `OpenAILike` class is the one meant for OpenAI-compatible servers that are not OpenAI:

```python
import os
from llama_index.llms.openai_like import OpenAILike

llm = OpenAILike(
    model="qwen2.5-3b-instruct",
    api_base="https://dicompute.ai/openai/v1",
    api_key=os.environ["DICO_API_KEY"],
    is_chat_model=True,
    max_tokens=128,
)
print(llm.complete("say OK"))
```

`is_chat_model=True` makes it use the chat endpoint instead of legacy completions. The parameter is `api_base`, not `base_url`. See the [LlamaIndex page](/integrations/llamaindex).

## Pydantic AI: `OpenAIProvider`

```python
import os
from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider

model = OpenAIChatModel(
    "qwen2.5-3b-instruct",
    provider=OpenAIProvider(
        base_url="https://dicompute.ai/openai/v1",
        api_key=os.environ["DICO_API_KEY"],
    ),
)
agent = Agent(model)
print(agent.run_sync("say OK").output)
```

The provider carries the URL and key, and the model object carries the name. Use a model id that `GET /openai/v1/models` returns. See the [Pydantic AI page](/integrations/pydantic-ai).

## Tools and structured output: the vouch caveat

Agents in all three frameworks work by tool calling, and Pydantic AI's structured output normally does too. DiCompute carries `tools` through correctly, but each model has a `capabilities.tools` flag that records whether an operator checked it. Today `qwen2.5-3b-instruct` is not vouched, and the vouched Llama models are not accepting requests. Read the live feed before you rely on it:

```bash
curl -sS https://dicompute.ai/openai/v1/models \
  | jq '.data[] | {id, tools: .capabilities.tools, can_accept: .metadata.can_accept}'
```

If you want structured results from the small model today, ask for JSON in the prompt and validate the reply with your own schema, with a retry on failure. Do not assume a framework agent loop will call tools correctly on a 3B model.

## Embeddings: no embedding model is served yet

The embeddings route exists, but no model in the catalogue has `embedding` set to true. LangChain's `OpenAIEmbeddings` and LlamaIndex's embedding classes have nothing to call. A retrieval pipeline needs an embedding model that you host or buy elsewhere, with DiCompute used only for the generation step. The managed knowledge-base feature is built and waiting on an embedding model, so it is not usable today either. Plan for generation only, and revisit when [/models](/models) lists an embedding model.

## Testing each with an invalid key

Before you spend anything, run each snippet with `DICO_API_KEY=sk-dico-invalid-example`. A correct setup fails fast with the same OpenAI-shaped error:

```
401 {"error":{"message":"invalid api key","type":"authentication_error","param":null,"code":"invalid_api_key"}}
```

We ran the three snippets above this way with the packages named in the install line. LangChain raised `OpenAIAuthenticationError`, LlamaIndex raised the OpenAI SDK's `AuthenticationError`, and Pydantic AI raised `ModelHTTPError` with status 401, each carrying that body. That proves the URL, headers and request body reach the server and parse. It says nothing about completion quality, which needs a real key and a balance. Set `max_retries=0` while testing so a failure returns at once.

## Cost and limits when a framework drives the calls

Frameworks make more requests than the code you wrote suggests. A chain with a retry policy, an agent that loops, or a retriever that re-queries can each multiply the number of calls behind one `invoke`. Three habits keep that visible:

- Give the framework its own key, with a spend cap, so a runaway loop stops at a ceiling you chose. [API keys](/docs/api-keys) explains caps and scopes.
- Set a retry count you understand. The `max_retries=0` above is for testing. In production, retry only on `429` and `5xx` responses, honor `retry-after`, and never retry a `402`, which means your balance or cap is exhausted. One `429` is not worth retrying either: a prompt too big for the model's window comes back as a `429`, and only a smaller request fixes it.
- Log the `x-request-id` header from each response. It is the key for any billing or reliability question later, and most framework callbacks can surface response headers.

Every request is billed at least $0.0001, so many tiny framework calls still add up. [Pricing](/pricing) shows the live rates, and the estimate endpoint prices a request before you send it.

## Next steps

- Read the [frameworks doc](/docs/frameworks), which also covers raw `fetch` and the Vercel AI SDK.
- Open the three pages: [LangChain](/integrations/langchain), [LlamaIndex](/integrations/llamaindex) and [Pydantic AI](/integrations/pydantic-ai).
- Start from [Building on the DiCompute API](/blog/building-on-the-dicompute-api) if you have no key yet.
- Check [/models](/models) before you design around tools or embeddings.
