---
title: "Open models in Cursor, Cline and Continue"
description: "IDE assistants can target DiCompute's OpenAI-compatible endpoint. What works for chat, what needs tool calling, and the settings for each."
date: 2026-10-11
authors: [DiCompute team]
tags: [coding-agents, ide, cursor]
categories: [engineering]
cover: /blog-assets/blog/open-models-in-cursor-cline-and-continue/banner.webp
coverAlt: "Duotone editorial illustration: ruled ledger lines crossed by small tally groups, one group picked out in accent; a cyan accent on a deep ink field."
---

Bring-your-own-model support became one of the most requested features in IDE
assistants in 2026. Cursor, Cline and Continue all let you point them at an
OpenAI-compatible endpoint, and DiCompute is one. This post gives the setting
for each, and is precise about which modes need tool calling, because that is
where an open-model backend usually falls over.

Read the status first. The three integrations are labelled "Documented, not
yet run" on [/integrations](/integrations). The settings below come from the
[coding agents guide](/docs/coding-agents), and nobody has recorded a live
session of these editors against DiCompute. Plain chat should work, since it is
an ordinary chat completion. **Agent modes are a different matter.** On the
live catalogue today, no model that is accepting requests carries a tools
vouch, so I make no claim that agent mode works on any model you can use now.

## What an IDE assistant sends to a model

An IDE assistant does three kinds of work. Each sends a different request:

- **Chat** sends your question plus the files you attach, as a normal chat
  completion. Any model can answer it.
- **Edits** ask the model to return changed code as text, which the editor
  then applies.
- **Agent mode** lets the model act: read files, edit them, run commands. Most
  agents implement that with function calling. The request carries a `tools`
  array, and the model must reply with a well-formed `tool_calls` entry.

Whether a model can do the third is published per model, as
`capabilities.tools` in `/openai/v1/models`. It is the operator's explicit
statement that the model has been checked end to end. The route forwards a
request with `tools` to any model, so a `false` flag doesn't produce an
error. It means nobody has confirmed the model produces correct calls.

## Cursor

In Cursor, go to Settings → Models, enable "Override OpenAI Base URL", and set:

- Base URL: `https://dicompute.ai/openai/v1`
- OpenAI API key: your `sk-dico-...` key
- Custom model: a model id from the live catalogue, for example
  `qwen2.5-3b-instruct`

This only changes the chat and agent panel. Cursor's Tab completion and inline
edit stay on Cursor's own backend, whatever you set here. Cursor's agent mode
is built on function calling with no documented fallback, so treat Cursor as
**chat-only** against a model without a tools vouch.

## Cline

In the Cline extension for VS Code, open the gear icon and choose API
Provider: "OpenAI Compatible". Set:

- Base URL: `https://dicompute.ai/openai/v1`
- API Key: your `sk-dico-...` key
- Model ID: an id from `/openai/v1/models`

Cline's agent loop is different. It parses XML tags out of an ordinary text
completion, not the OpenAI `tool_calls` fields. So it is plausible that its
agent mode works with a model whose `capabilities.tools` is `false`. The
guide's own words are "worth trying, not confirmed", because it has not been
checked end to end against any model here. Try it on a throwaway repository
first, and review every change it proposes before you accept it.

## Continue

Continue reads `config.yaml`. A model entry for DiCompute looks like this:

```yaml
models:
  - name: dicompute-qwen
    provider: openai
    model: qwen2.5-3b-instruct
    apiBase: https://dicompute.ai/openai/v1
    apiKey: sk-dico-...   # placeholder: see the last section before committing a real key
```

Plain chat works straight away. Continue's agent mode expects native tool
calling. For a model that doesn't declare it, Continue has a fallback of its
own: it writes the tool definitions into the system prompt and parses the
reply as XML. You enable it per model, through `capabilities.tool_use` in the
model config. That is Continue's mechanism, and DiCompute does nothing special
for it. Expect it to be less reliable than native tool calling, and more so on
a 3B model.

## Which modes need a tools-capable model, and today's catalogue

| Tool | Chat | Agent mode |
|---|---|---|
| Cursor | yes | needs native tool calling |
| Cline | yes | XML loop, plausible but unconfirmed |
| Continue | yes | native tools, or its XML fallback |

On 2026-10-11, `/openai/v1/models` listed five models:

- `qwen2.5-3b-instruct` accepts requests. It has no tools vouch and a
  1,024-token context window.
- `qwen2.5-0.5b-instruct` and `ternary-bonsai-2-27b` also report
  `can_accept: true`. They are fleet-served, and the fleet carries traffic
  for one internal test account only. Don't build on them yet.
- `llama-3.3-70b-instruct` and `llama-3.2-90b-vision-instruct` carry the tools
  vouch, and both reported `can_accept: false`.

Check the live state yourself:

```bash
curl -sS https://dicompute.ai/openai/v1/models \
  | jq '.data[] | {id, tools: .capabilities.tools, can_accept: .metadata.can_accept, context: .context_length}'
```

An IDE assistant's system prompt and file context are large. With a 1,024-token
window, a chat turn that attaches one big file can't fit at all, and an
oversized request is refused with a `429` that retrying never clears. Attach
selections, not whole files. The in-browser
[token counter](/tools/token-counter) shows how big a prompt is before you send it.

To confirm a setup before you rely on it, point the editor at a deliberately
wrong key. A chat request should fail with `401` and the OpenAI-shaped body
`{"error":{"message":"invalid api key","type":"authentication_error",...}}`. I
ran that request shape with `sk-dico-invalid-example` against the live API and
got exactly that.

## Keeping your key out of synced settings

All three tools store the key in their own settings, and settings files are
easy to leak. Editors can sync them across machines, and a `config.yaml` can
end up in a repository. A few habits help:

- Never commit a file that holds a live `sk-dico-` key. If your tool supports
  reading a secret from an environment variable or its own secret store, use
  that. The placeholder in the Continue example above is not a pattern to copy.
- Create a separate key for each editor on [/settings/keys](/settings/keys),
  with a spend cap and a model allowlist. Revoke it if a settings file leaks.
  [API keys](/docs/api-keys) covers scopes, caps and rotation.

## Next steps

- [Coding agents](/docs/coding-agents): the full per-tool configuration.
- [Cursor](/integrations/cursor), [Cline](/integrations/cline) and [Continue](/integrations/continue): the integration entries and their status.
- [Models](/models): the live catalogue and each model's capabilities.
- [Building on the DiCompute API](/blog/building-on-the-dicompute-api): keys, base URL, rate limits and errors.
