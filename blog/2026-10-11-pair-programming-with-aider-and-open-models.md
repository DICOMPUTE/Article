---
title: "Pair programming with aider and open models"
description: "Aider needs no tool calling, which makes it the safest coding agent to run on DiCompute today. Setup, model choice and workflow tips."
date: 2026-10-11
authors: [DiCompute team]
tags: [coding-agents, aider, open-models]
categories: [engineering]
cover: /blog-assets/blog/pair-programming-with-aider-and-open-models/banner.webp
coverAlt: "Duotone editorial illustration: ruled ledger lines crossed by small tally groups, one group picked out in accent; a cyan accent on a deep ink field."
---

Open-source coding agents like [aider](https://aider.chat) grew fast in 2026,
as developers looked for tools that work with any model. Aider is a terminal
pair programmer. You tell it which files it may edit, ask for a change, and it
writes the edit and commits it to git. Its default edit formats are plain text,
so it suits small open models. That is why the
[coding agents guide](/docs/coding-agents) calls it the safest place to start on DiCompute.

Here is the honest status. The DiCompute docs list aider as "works today, no
tool calling required", and the integration is labelled "Documented, not yet
run": no end-to-end aider session has been
recorded against this API. So I make no claim about the quality of the edits you will
get. What I can check is the setup, and the facts that shape a good workflow:
the only model accepting requests on the direct engine today is a 3B model
with a 1,024-token context window. This post is built around that limit.

## Why aider is the safe first agent

Most coding agents lean on tool calling: the model emits a structured call to
"edit this file" or "run this command", and the agent executes it. That needs
a model that reliably produces those calls. As of today, no model that is
accepting requests carries a tools vouch in `/openai/v1/models`. Aider's
default `whole` and `diff` formats avoid the problem. The model returns the
edit as text, either a whole file or a search/replace block, and aider applies
it. From DiCompute's side it's an ordinary chat completion, the same as the
[quickstart](/docs/quickstart) example.

## Setup

Aider reads an OpenAI-compatible endpoint from two environment variables, and
you pass the model with an `openai/` prefix:

```bash
export OPENAI_API_BASE="https://dicompute.ai/openai/v1"
export OPENAI_API_KEY="sk-dico-..."   # your key; never commit it
aider --model openai/qwen2.5-3b-instruct
```

Aider also accepts `--openai-api-base` and `--openai-api-key` as flags, if you
prefer not to export variables. Get the key at
[/settings/keys](/settings/keys). It is shown once.

Before you start a long session, check the endpoint with a deliberately bad
key. I ran the same request aider sends, a chat completion, with
`sk-dico-invalid-example`, and got the expected `401`:

```bash
curl -sS https://dicompute.ai/openai/v1/chat/completions \
  -H "authorization: Bearer sk-dico-invalid-example" \
  -H 'content-type: application/json' \
  -d '{"model":"qwen2.5-3b-instruct","messages":[{"role":"user","content":"say OK"}]}'
```

The response:

```json
{"error":{"message":"invalid api key","type":"authentication_error","param":null,"code":"invalid_api_key"}}
```

## Picking a model from the live catalogue

Don't copy a model id from a blog post, including this one. Ask the API
which models accept requests right now:

```bash
curl -sS https://dicompute.ai/openai/v1/models \
  | jq -r '.data[] | select(.metadata.can_accept) | "\(.id)\t\(.context_length)"'
```

When I ran this on 2026-10-11, three models had `can_accept: true`.
`qwen2.5-3b-instruct` is the one served on the direct engine. It is CPU-served
and small. Its `context_length` is 1,024 tokens. The other two accepting
models are fleet-served, and the fleet carries traffic for one internal test
account only, so don't plan around them. [/models](/models) shows the same
catalogue, and it changes.

## Working within a small context window

A 1,024-token window holds your prompt, aider's system prompt, the file
contents and the reply, all together. That's roughly a few hundred words in
total. So the discipline is simple:

- **Add only the files you need.** In aider, `/add path/to/file` puts a file
  in the chat and `/drop` removes it. Keep one small file in context at a time.
- **Prefer small files.** If a file is too long to fit, the request can't. A
  request that can never fit gets a `429` whose message says so, and it will
  never clear on retry. Split the file first.
- **Make targeted asks.** "Rename this function and update its two callers"
  works. "Refactor the module" doesn't.
- **Don't preload the repo.** Aider can build a repository map for larger
  models. Against a window this small, turn it down or off (`--map-tokens 0`).
- **Use `/clear` often.** Chat history counts against the window too.

If a task needs more room, the catalogue's larger-window models are fleet-only
and not accepting right now, so the answer today is to cut the task down.
You can size a prompt before sending it with the in-browser
[token counter](/tools/token-counter). The text never leaves the page.

## Edit formats and reviewing diffs

Aider applies each edit, then commits it with a generated message. That is
your review point. Treat every commit as a suggestion you have not read yet:

1. Run `git diff HEAD~1` after each turn, or use aider's `/diff`.
2. Run your tests yourself, rather than trusting the model's summary.
3. If an edit is wrong, `/undo` reverts aider's last commit.

Small models make formatting mistakes in search/replace blocks. When aider
reports it couldn't apply an edit, try the `whole` format (`--edit-format
whole`), which asks for the entire file back. It uses more tokens and so
needs a smaller file, but it has fewer ways to go wrong.

## Keeping cost visible

Pricing is per request. For `qwen2.5-3b-instruct`, the pricing feed lists
$0.05 per million input tokens and $0.20 per million output tokens, with a
minimum charge of $0.0001 per request. Those are the values on 2026-10-11, and
[/pricing](/pricing) is the source for them. They can change. With a
1,024-token window, many small aider turns land on the minimum charge, so
the number of requests matters more than the number of tokens. Each request
reserves its worst case, based on max output tokens, and settles at what it
used. A per-key spend cap, which you can set on a key, is the backstop. See
[API keys](/docs/api-keys).

## Single-use setup from /connect

[/connect](/connect) creates a single-use setup link for a coding client,
aider among them. It expires in 15 minutes and contains no key. The script it
serves reads your key from the `DICO_API_KEY` environment variable and prints
config that names the variable. It never writes the value. The per-client steps
are in [/connect.md](/connect.md). Download the script and run it. Don't pipe
it into `sh`, because the key comes in on standard input.

## Next steps

- [Coding agents](/docs/coding-agents): the config for aider and the other clients.
- [Aider integration](/integrations/aider): its documented status.
- [/connect](/connect): single-use setup links.
- [Pricing](/pricing): live rates and the minimum charge.
- [Building on the DiCompute API](/blog/building-on-the-dicompute-api): keys, errors and rate limits.
