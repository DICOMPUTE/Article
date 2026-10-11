---
title: "Open-weight AI models, explained without the jargon"
description: "What \"open-weight\" means, how open models differ from closed chatbots, and what that changes for you when you chat on DiCompute."
date: 2026-10-11
authors: [DiCompute team]
tags: [open-models, explainers, models]
categories: [product]
cover: /blog-assets/blog/open-weight-models-explained/banner.webp
coverAlt: "Duotone editorial illustration: a tilted orbit ring around a solid point, with a second point travelling the ring, picked out in accent; an amber accent on a deep ink field."
---

Through 2025 and 2026, "open-weight" became one of the most repeated phrases in AI news. New open releases kept arriving, and everyday users started meeting the term in app menus without anyone explaining it. This post explains it in plain language and says what it means for you when you chat on DiCompute.

It is written for people who use AI, not people who build it. You don't need any math. One honest limit up front: this post explains how open models work in general. It does not rank them against any closed model, because nothing here supports a ranking.

## What a model's weights are

An AI language model is, at bottom, a very large file of numbers. Those numbers are called **weights**. They were set during training, when the model read a huge amount of text and adjusted itself, bit by bit, to get better at predicting what text comes next. When you ask a question, software loads the weights and uses them to write a reply one small piece of text at a time.

The weights are the model. The chat window is just a way of talking to them.

## Open-weight versus closed

With a **closed** model, the company that trained it keeps the weights private. You can use it only through that company's app or service. You can't download it, run it somewhere else, or look at what it's made of.

With an **open-weight** model, the weights are published. Anyone who accepts the model's license can download the file and run it on their own hardware, or on a service that hosts it. Licenses differ from model to model, so "open-weight" does not mean "no rules". It means the file itself is available.

Two clarifications, because the words get blurred:

- **Open-weight is not the same as fully open source.** You usually get the finished weights, not the training data or every step used to make them.
- **Open-weight does not mean free to use anywhere.** Running a large model takes real computers, and someone has to pay for them. That cost is why hosts, including DiCompute, charge per use.

## The families in DiCompute's catalogue today

DiCompute's catalogue is made up of open-weight models from three families: Qwen, Llama and Ternary Bonsai. At the time of writing, [/models](/models) lists five models, from small to large. For example, `qwen2.5-0.5b-instruct` and `qwen2.5-3b-instruct` are small, while `llama-3.3-70b-instruct` is much larger. The number in a name, like 3b or 70b, is roughly how many billions of weights the model has.

This list changes. Models are added, and a model can be listed without accepting requests at a given moment. Treat [/models](/models) as the source of truth, not this post. The [models guide](/docs/models) explains how to read each entry.

## What open weights change for you

**Prices are visible.** Because the model is not locked behind one company's product, the price of running it can be shown as a plain number. DiCompute's [pricing page](/pricing) lists a rate per million tokens for each model, read live from the same catalogue the console uses. A token is roughly a short word or part of one.

**Many possible hosts.** Anyone can serve an open model, so the same model can be offered in more than one place. DiCompute is built so that provider machines can serve models too. Be clear about the present, though: today, requests are served by the platform's own engine, and the provider network carries traffic for one internal test account only. Check [/models](/models) to see what is accepting requests before you rely on a particular model.

**Less lock-in to one app.** Your conversations aren't tied to one vendor's model. If a model changes or retires, you can pick another from the catalogue and carry on. DiCompute can also export a chat as Markdown or JSON, and import chats from other tools, so your history is yours to take elsewhere.

## What open weights don't change

Open does not mean smarter, safer or more accurate. The models in the catalogue range from small to large, and the small ones in particular make mistakes: they can sound confident and be wrong, miss details in a long message, or invent a fact. This is true of every language model, open or closed.

Open weights also don't make your messages private. On DiCompute today, the people running the service can read prompts and replies. An encrypted lane that would narrow who can see them is built but switched off, and even that lane would not hide your text from the operator. The [trust page](/trust) has the details, and the [day-to-day guide](/blog/using-dicompute-day-to-day) lists what to keep out of a chat.

So the habit stays the same whichever model you pick: read the answer, and check anything that matters before you rely on it.

## Seeing size, context and price on /models

Open [/models](/models). For each model you can see:

- **Price.** Separate rates for what you send and for what comes back, per million tokens.
- **Context window.** How much text the model can hold at once, counting your message and the conversation so far. Today's smallest window is 1,024 tokens, on `qwen2.5-3b-instruct`. The largest listed is 131,072.
- **Whether it is serving.** The catalogue shows how many healthy providers are online for each model. A model with none online can't answer you, and, as noted above, models served by the provider network aren't open to ordinary accounts yet.

The [pricing page](/pricing) shows the same rates next to a monthly cost estimator. Both pages read the live catalogue, so the figures above can change. What you see there is what the console charges.

## Where to go from here

- Browse the live catalogue on [/models](/models).
- Read how rates work on [/pricing](/pricing).
- Read how to compare and choose in the [models guide](/docs/models).
- Start with the basics in [Using DiCompute day to day](/blog/using-dicompute-day-to-day).
