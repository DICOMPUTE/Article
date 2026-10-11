---
title: "Comparing AI models side by side"
description: "Use the compare page and the blind model arena to choose a model by price, context and your own judgement rather than marketing."
date: 2026-10-11
authors: [DiCompute team]
tags: [models, compare, arena]
categories: [product]
cover: /blog-assets/blog/comparing-ai-models-side-by-side/banner.webp
coverAlt: "Duotone editorial illustration: a tilted orbit ring around a solid point, with a second point travelling the ring, picked out in accent; an amber accent on a deep ink field."
---

Blind arenas and public leaderboards became a common way to choose a model in
2025 and 2026, because brand names and launch-day claims tell you little about
how a model handles your own work. DiCompute has two pages built for this: a
compare page that lines up facts, and a blind arena where you judge answers
without knowing who wrote them. This guide shows how to use both, and says
plainly that the arena's leaderboard has no ranking yet.

## Why "which model?" is hard

The catalog holds open-weight models in several families, at different prices
and with very different context windows. Scores published elsewhere measure
other people's tasks. A model that is excellent at one kind of prompt can be
ordinary at another. And on DiCompute, a model on the list isn't necessarily
accepting requests at this moment, so availability is part of the choice too.

Rather than trust a ranking, you can build your own small evidence.

## The compare page

[/models/compare](/models/compare) puts models next to each other. Choose two to
four models from the catalog, or tick the Compare box on a model's entry at
[/models](/models), and the page shows live price and capacity side by side, read
from the same feeds the model catalog uses.

That makes it the right place for the facts you can check:

- **Price.** Per million tokens, with separate rates for input and output. The
  same live rates are on [/pricing](/pricing), and the numbers can change, so
  read them on the day you decide.
- **Context window.** How much text the model can see at once. A model with a
  small window can't take a long document, however good it is. Today the
  windows in the catalog range from 1,024 tokens to 131,072.
- **Capacity.** Whether the model can take requests right now.

## The arena

The blind arena is on the compare page, and [/models/arena](/models/arena)
explains the ranking it feeds. It works like this: two models answer the same
prompt with their names hidden, and you pick the answer you think is better.
You write the prompt, so the test is about your task.

## Why blind voting beats brand loyalty

When you know the name, you read the answer differently. A longer reply from a
famous model feels more thorough, and a plainer reply from an unfamiliar one
feels thin. Hiding the names removes that. You judge style, accuracy, format and
length on the page in front of you. Often the answer you prefer comes from a
model you would not have picked first, and it may also be the cheaper one.

Keep in mind what the votes are. The arena page describes them as a preference
ranking from real use, not a benchmark. They tell you which answers people liked,
not which model is correct.

## Reading the leaderboard

The arena page ranks models using votes from this deployment's own users over
the trailing 30 days. Today it says that no model has enough distinct votes to
rank yet. So there is nothing to read there, and this guide doesn't quote a
ranking, because none exists. Votes you cast are how it starts to fill in, and
when it does, treat it as one input among several, with the vote window in mind:
only the last 30 days count.

## What the compare page can't tell you

Price, window and capacity are facts, but they say nothing about how good an
answer is. A cheap model with a huge window can still write a poor summary, and
an expensive one can still be the wrong fit. That gap is the reason the arena
exists: facts to shortlist, your own judgement to decide.

## A simple routine

1. **Shortlist on facts.** On [/models/compare](/models/compare), drop any model
   whose context window is too small for your usual task or whose price is
   beyond your budget.
2. **Check availability.** A model that can't accept requests now can't answer
   you, whatever its specifications say.
3. **Judge on your own prompts.** Use two or three prompts that look like your
   real work, in the arena or in separate chats, and compare the answers with the
   names hidden if you can.
4. **Check the cost of what you chose.** Look at [/pricing](/pricing) again and,
   if you use it often, at your spend afterward.
5. **Revisit.** The catalog changes. Repeat the routine when a new model
   appears.

The models here are small open models, so expect them to suit everyday drafting,
summarizing and explaining better than very hard reasoning. The point of the
routine is to find out for your own tasks, not to take our word for it.

## Where to go from here

- [/models/compare](/models/compare) and [/models/arena](/models/arena), to try
  both.
- [/models](/models) and [/pricing](/pricing), for the live catalog and rates.
- [Using DiCompute day to day](/blog/using-dicompute-day-to-day), for choosing a
  model in the chat window.
