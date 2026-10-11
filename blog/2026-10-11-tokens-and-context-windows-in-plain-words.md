---
title: "Tokens and context windows, in plain words"
description: "Why a model 'forgets' the start of a long chat, what a token is, and how to check a prompt fits before you send it."
date: 2026-10-11
authors: [DiCompute team]
tags: [explainers, context-window, tools]
categories: [product]
cover: /blog-assets/blog/tokens-and-context-windows-in-plain-words/banner.webp
coverAlt: "Duotone editorial illustration: a tilted orbit ring around a solid point, with a second point travelling the ring, picked out in accent; an amber accent on a deep ink field."
---

Through 2026, AI products have advertised ever-larger context windows, yet
most people still can't say what the number means. It matters, because it
explains two things that confuse new users: why a model seems to forget how a
long chat began, and why a very long paste sometimes gets refused. This guide
explains both in everyday terms, then shows two free tools that let you check
before you send.

## What a token is

A model doesn't read letters or whole words. It reads **tokens**: chunks of
text, usually a short word or a piece of a longer one. "Cat" is likely one
token. A long or unusual word is often split into several. Punctuation, spaces
and numbers count too.

You don't need an exact ratio, and nobody can give you one that holds for every
model and every language. Different models use different tokenizers, so the same
sentence can come out at slightly different counts. Think of tokens as the unit
the model counts in, the way a printer counts pages rather than words. That
unit also sets the price: DiCompute bills per million tokens, with separate
rates for what you send and what comes back. See [/pricing](/pricing).

## The context window

The **context window** is everything the model can see at once. Picture a desk
of a fixed size. Your messages, the model's earlier replies, any text you pasted
and the reply being written all have to fit on that desk together. Nothing
outside the desk exists as far as the model is concerned.

That explains the "forgetting". In a long chat, the whole conversation is sent
back to the model on every turn. When the conversation outgrows the desk,
something has to give: the oldest parts fall off, or the request is refused.
The model hasn't lost interest. The early messages are simply no longer on the
desk.

The window covers **the reply too**. If a model's window is 1,024 tokens and
your prompt takes 1,000, there is almost no room left for an answer.

## Why windows vary so much

Models are built differently, so the catalog mixes small and large windows. According to the live `/openai/v1/models` feed
on the day this was written, the five models listed are:

| Model | Context window (tokens) |
|---|---|
| `qwen2.5-3b-instruct` | 1,024 |
| `qwen2.5-0.5b-instruct` | 32,768 |
| `ternary-bonsai-2-27b` | 32,768 |
| `llama-3.3-70b-instruct` | 131,072 |
| `llama-3.2-90b-vision-instruct` | 131,072 |

The catalog changes and not every model accepts requests at every moment, so
treat [/models](/models) as the source of truth, and look at a model's
availability as well as its window before you plan around it. The small window on
the first row is a real limit: it suits short questions, not pasted documents.

## The token counter

The [token counter](/tools/token-counter) estimates how many tokens a piece of
text uses. It runs entirely in your browser, so the text you paste never leaves
the page; the page itself says it makes no network requests.

It's an estimate, not a measurement. The page uses a character heuristic of
roughly four characters per token (one per CJK character or emoji) and says
plainly that it is not the exact tokenizer of any served model, so billed counts
can differ. Use it to know whether you are near 200 tokens or near 20,000, not
to predict a bill to the last digit.

## The context-length checker

The [context-length checker](/tools/context-check) answers the practical
question: will this prompt, plus the reply I want, fit in this model's window?
Paste your text, pick a model and set `max_tokens`, the most you want the
model to write back. The tool adds them up against the model's window.

It keeps your text in the browser too. The only request it makes is a plain
read of the public model list, to learn each model's window. It uses the same
heuristic as the counter, so leave yourself some margin rather than aiming for
exactly the limit.

## Habits that keep you inside the window

- **Start a fresh chat for a new task.** An old thread carries its whole
  history with it on every turn. A new topic doesn't need the old one.
- **Summarize long threads.** When a conversation has run long, ask the model
  for a short summary of the decisions so far, then open a new chat and paste
  only that summary.
- **Paste only what's needed.** Three relevant paragraphs usually beat a whole
  document, and they cost less.
- **Leave room for the answer.** If you want a long reply, don't fill the
  window with the prompt.
- **Match the model to the job.** Short question, small window is fine. A long
  document needs a larger window.

## Where to go from here

- [Using DiCompute day to day](/blog/using-dicompute-day-to-day), for picking a
  model and everyday tasks.
- [/models](/models), for each model's window, price and availability.
- The [token counter](/tools/token-counter) and the
  [context-length checker](/tools/context-check), for a quick check before a
  long paste.
