---
title: "What small AI models are actually good at"
description: "Small open models are fast and cheap but have limits. A practical guide to the jobs they handle well and the ones to avoid."
date: 2026-10-11
authors: [DiCompute team]
tags: [models, small-models, everyday-ai]
categories: [product]
cover: /blog-assets/blog/what-small-ai-models-are-good-at/banner.webp
coverAlt: "Duotone editorial illustration: a tilted orbit ring around a solid point, with a second point travelling the ring, picked out in accent; an amber accent on a deep ink field."
---

Small language models running on modest hardware were one of the defining AI trends of 2025 and 2026. That is why you now see them everywhere, including in DiCompute's catalogue. But "small" is a size, not a promise. A small model is a good tool for some jobs and a poor one for others.

This post is a practical guide to matching your job to the model. It uses the real catalogue as it stands today, and it makes no claims about rankings or benchmark scores. It is for people who chat with AI, not people who build with it.

## Why small models are everywhere

A model's size is usually described by how many weights it has: the numbers that make up the model (open-weight models publish them, and you can see each model's size in its name, like 3b for roughly three billion). Fewer weights mean less computing power per reply. That makes a small model cheaper to run, and it is why small models can run on ordinary machines.

That cost shows up in prices. On the [models page](/models), `qwen2.5-3b-instruct` is listed at $0.05 per million input tokens and $0.20 per million output tokens, as of this post. The larger `llama-3.3-70b-instruct` is $0.60 for both. Check the page for today's figures, because they can change.

## Good fits

Small models do well on short, self-contained jobs where you can see right away whether the answer is good:

- **Rewording.** Make a paragraph friendlier, shorter or more formal.
- **Short summaries.** Paste in a few paragraphs of notes and ask for three key points.
- **Quick explanations.** "What does this error message mean?" or "Explain compound interest in plain words."
- **Brainstorming lists.** Names, subject lines, questions to ask, ideas for a weekend. You pick the good ones, so a few weak items cost you nothing.
- **Drafting a first pass.** A rough email or outline that you then edit yourself.

What these jobs share is that you are the check. You read the result, and a mistake is easy to spot and cheap to fix.

## Poor fits

Be careful, or pick a different tool, for:

- **Long documents.** A small model may have a small context window (below), and even when the text fits, details in the middle can get lost.
- **Multi-step reasoning.** Long chains of logic, tricky math, or plans where each step depends on the last. A small model can slip in the middle and still sound sure of itself.
- **Anything you can't check.** Medical, legal and money decisions, or a fact you can't verify elsewhere. If you can't tell whether the answer is right, don't rely on it.
- **Exact quoting.** A model can invent a quotation, a name or a source. Ask it to explain, not to cite.

This list applies to larger models too, only less often. The habit is the same at any size: read the answer before you use it.

## Context window: the hidden constraint

A model's **context window** is how much text it can hold at once. It counts your message, the chat so far and the reply. When a conversation outgrows the window, the model can't take it all in.

The sizes in the live catalogue differ a lot. As of this post, according to the [models page](/models):

| Model | Context window (tokens) |
|---|---|
| `qwen2.5-3b-instruct` | 1,024 |
| `qwen2.5-0.5b-instruct` | 32,768 |
| `ternary-bonsai-2-27b` | 32,768 |
| `llama-3.3-70b-instruct` | 131,072 |
| `llama-3.2-90b-vision-instruct` | 131,072 |

The `qwen2.5-3b-instruct` window of 1,024 tokens is small, so it suits short questions and short passages, not a long paste. To see whether your text fits before you send it, use the [context length checker](/tools/context-check). It runs in your browser, so the text isn't sent anywhere.

## Splitting a big job into small, checkable steps

When a job is too big for a small model, don't force it. Cut it up. For example, to summarize a long report:

1. Split the report into sections that fit the window.
2. Ask for a short summary of each section, one at a time.
3. Read each summary against its section. This is where you catch mistakes.
4. Paste the short summaries together and ask for one overall summary.

Each step is small, so the model handles it well, and each is easy for you to check. The same idea works for a plan ("list the steps", then "expand step two") or for editing ("fix the tone", then "shorten it").

## When to pick a bigger model

Pick a bigger model when your text is too long for a small window, or when the job needs more careful working through. In the catalogue, the larger models have much bigger windows. Two things to check first:

- **Can you use it yet?** A model can be listed and still not be open to you. Today, every model except `qwen2.5-3b-instruct` is served by the provider network, which carries traffic for one internal test account only, so for now a bigger model is not something you can switch to. The [models page](/models) shows which models are serving, and it changes.
- **What does it cost?** Larger models cost more per token. The [compare page](/models/compare) puts models side by side.

A bigger model is not a guarantee of a right answer. It is a model with more room and, usually, fewer slips.

## Where to go from here

- See size, context and price on [/models](/models).
- Put models side by side on [/models/compare](/models/compare).
- Check whether text fits with the [context length checker](/tools/context-check).
- Learn the basics in [Using DiCompute day to day](/blog/using-dicompute-day-to-day).
