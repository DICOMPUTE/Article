---
title: "Prompting tips for small open models"
description: "Small models reward clear, short prompts. Concrete techniques that get better answers from compact open models."
date: 2026-10-11
authors: [DiCompute team]
tags: [prompting, small-models, everyday-ai]
categories: [product]
cover: /blog-assets/blog/prompting-tips-for-small-open-models/banner.webp
coverAlt: "Duotone editorial illustration: a tilted orbit ring around a solid point, with a second point travelling the ring, picked out in accent; an amber accent on a deep ink field."
---

By 2026, small open models run inside everyday tools, but most prompting advice
is still written for the largest models. DiCompute's catalog is made of
open-weight models in the Qwen, Llama and Ternary Bonsai families, and some have
tight context windows (the live `/openai/v1/models` feed lists one at 1,024
tokens). This guide collects habits that suit models like these. They are
practical rules of thumb, not guarantees: no technique here promises a particular
improvement, and the way to learn what works is to try it on your own task.

## Why prompts written for giant models fail

A long, polite, many-part prompt can work on a very large model. A small model
has less room and less slack. Several instructions in one paragraph may get
half-followed. A vague request gets a vague answer. And a long prompt may simply
not fit: the window holds your prompt and the reply together.

So the guiding idea is to be **explicit and short**. Remove what doesn't help,
and say the rest plainly.

## Say exactly what you want

A good prompt covers four things: who the model should act as, the task, the
format, and the length. Compare:

> Write something about our new schedule.

> You are a friendly office manager. Write a three-sentence message telling the
> team the Friday meeting moves to 10:00. Keep it casual and end with a
> thank-you.

The second leaves the model almost nothing to guess. If a detail matters, state
it, rather than hoping it will be inferred.

## One good example beats three paragraphs

Showing is stronger than describing. If you want a particular style, give one
short example and ask for more in that style:

> Turn each note into a polite one-line reminder.
> Note: "need invoice from Sam" → Reminder: "Hi Sam, could you send me the invoice
> when you have a moment?"
> Note: "chase the printer repair" → Reminder:

An example fixes tone, length and layout in a few tokens, which a paragraph of
description often fails to do. Keep it to one or two. More examples start eating
the window.

## Ask for structure

If you want something you can scan, say so: bullets, a table, numbered steps, or
"three options, each under 20 words". Structure also makes mistakes easier to
spot, because each claim sits on its own line. When you need to reuse the output,
name the exact layout, for example "a table with columns Task, Owner, Date".

## Break big tasks into small chats

Small models do better with a narrow job. Instead of "read this report and write
an executive summary with risks and a plan", chain smaller steps:

1. Ask for the five key points of the first section.
2. Repeat for each section in a fresh chat.
3. Paste only those short results into a final chat and ask for the summary.

Each step stays well inside the window, and you can check each result before
building on it. A fresh chat for each step also means the earlier text isn't
carried along and counted against the window every turn.

## Stay inside the context window

The window has to hold your prompt, the conversation so far and the reply. If
you paste a long text into a model with a small window, the request may be
refused or the start of it dropped. Before a long paste, run it through the
[context-length checker](/tools/context-check): it tells you whether a prompt
plus the reply you want fits a model's window, and your text stays in the browser.
Its count is an estimate, so leave a margin. Check [/models](/models) for each
model's window and whether it is accepting requests today. The
[day-to-day guide](/blog/using-dicompute-day-to-day) covers picking a model.

## Always read the answer

A small model can sound sure and be wrong. It may invent a detail, misread a
number, or drift from your instruction. Treat the reply as a draft. Check names,
dates, figures and anything you will act on. If it matters, ask the model to show
its steps or the part of your text it relied on, then confirm that against the
source yourself.

## A short checklist

- State role, task, format and length.
- Add one example when style matters.
- Request a structure you can scan.
- Split big jobs into small chats.
- Check the prompt fits the window.
- Read the answer before using it.

Try these in [the console](/console), and if an answer is off, change one thing
at a time so you can see which change helped.

## Where to go from here

- [Using DiCompute day to day](/blog/using-dicompute-day-to-day), for the basics
  of chatting and picking a model.
- The [context-length checker](/tools/context-check), before a long paste.
- [/models](/models), for each model's window and price.
- [The console](/console), to try a prompt.
