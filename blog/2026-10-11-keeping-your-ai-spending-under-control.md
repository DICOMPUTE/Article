---
title: "Keeping your AI spending under control"
description: "Set spend limits, auto-reload and alerts, and read your spend history, so pay-as-you-go never surprises you."
date: 2026-10-11
authors: [DiCompute team]
tags: [billing, cost-control, settings]
categories: [product]
cover: /blog-assets/blog/keeping-your-ai-spending-under-control/banner.webp
coverAlt: "Duotone editorial illustration: a tilted orbit ring around a solid point, with a second point travelling the ring, picked out in accent; an amber accent on a deep ink field."
---

Surprise AI bills and runaway agent spending made cost guardrails a hot topic in 2026. Usage-based billing is flexible, but it makes some people nervous for a good reason: if the meter runs and nobody is watching, the total can surprise you.

DiCompute includes controls for this: spend limits, alerts, auto-reload and a spend history. This post shows what each one does, what it can and can't stop, and a short monthly routine. It doesn't quote default limit values, because those are set by the service and can change. The [billing guide](/docs/billing) is the source for exact figures.

## The worry with metered AI, and why controls matter

With a flat subscription, the most you can lose is the monthly fee. With pay-per-use, spending follows usage. For a person chatting in the console, usage is usually small. The risk is higher when something runs without you: an app, a script, or a tool that sends many requests. A forgotten loop can send thousands of requests while you sleep.

Controls turn "I hope it's fine" into "it can't go past this". The [pricing page](/pricing) lists spend limits and alerts, and auto-reload, as included on the standard self-serve plan.

## Where billing lives

Billing is under Settings → Billing in the console. That is where you add credit through a Stripe checkout. The [billing guide](/docs/billing) describes each control in this post in full, including how each one is set. For a map of "where did my balance go, and what's capping me?", the [usage and limits guide](/docs/usage-and-limits) lists which screen or route answers each question.

## Spend limits and alerts

There are three related safeguards, and they do different jobs:

- **A low-balance alert.** You set a balance level, and when your balance drops below it you get a warning. It warns you. It does not stop anything. According to the billing guide, a default level is set the first time you add credit, and you can change or switch it off.
- **An account spend ceiling.** This is a hard limit on how much your account can spend in a window that you choose: it can reset daily, weekly or monthly, or never. When a request would cross the ceiling, it is refused before it reaches the model, and your balance is left untouched. This is the one that stops a runaway.
- **An earlier warning on the ceiling.** You can also set a point below the ceiling at which you're warned, so you hear about a fast-moving job before it hits the wall.

If you use API keys, a key can also have its own spend cap on top of the account ceiling. A key that has hit its cap is refused even when the account balance is healthy. That is the right tool for an app or tool that should only ever spend a small amount.

An account that has never set a ceiling has none of its own, so if you want a hard stop, set one and check what is in effect. The billing guide shows where the effective limit came from.

## Auto-reload: convenience versus control

Auto-reload tops up your balance by itself when it runs low. It is convenient: long jobs don't stall for lack of credit. But it also removes a natural stop, because your balance no longer runs out.

According to the billing guide, auto-reload is checked right after a request is charged, and it needs the Stripe checkout setup to be working. Organization accounts can't configure it yet.

A sensible way to think about it:

- **Turn it on** if you rely on the service and a stalled job would cost you more than a top-up.
- **Leave it off** if you're experimenting, or if you want the balance itself to be your budget.
- **If you turn it on, set a spend ceiling too.** Auto-reload keeps the balance full, and the ceiling caps the total. Together they say "keep running, but never past this much per month".

## Reading what a request cost, and your spend history

You can see the cost of what you've used:

- **What one request cost.** Every response reports the tokens it used, and the billing guide explains how to read the charge per request. Multiply the tokens by the model's listed rate on [/pricing](/pricing) and you can reproduce the charge, remembering the minimum of $0.0001 per request.
- **Your spend history.** The billing guide describes an itemized record of every charge and refund on your account, which you can page through or export as a spreadsheet file for your records. A request that is refused before it runs still appears in the request list, but isn't charged.
- **A monthly statement.** The guide also describes a statement for a closed month.

Reserve-then-settle explains one confusing sight: you may see a larger amount held while a long reply is written, then a smaller final charge. The difference returns to your balance, so look at the settled amount.

## Cheaper choices

Two habits lower the bill without changing what you do:

- **Use a smaller model for small jobs.** Rates differ a lot from model to model. On [/pricing](/pricing), as of this post, `qwen2.5-0.5b-instruct` lists $0.01 per million input tokens, and `llama-3.3-70b-instruct` lists $0.60. Rewording a sentence doesn't need the biggest model. Check which models are accepting requests on [/models](/models).
- **Ask for shorter replies.** You pay for the words you get back, at a higher rate than the words you send. "In three bullet points" or "in two sentences" costs less than an open-ended answer.

Because of the per-request minimum, very short requests all cost about the same. Cutting a tiny question down further saves nothing.

## A five-minute monthly check-up

Once a month, take five minutes:

1. **Check the balance.** Does the number match what you expected?
2. **Skim your spend history.** Look for a day that stands out. If one does, find out what ran then.
3. **Check the limits.** Is your spend ceiling still the amount you want? Is the low-balance alert set at a level that gives you time to act?
4. **Review auto-reload.** Do you still want it on?
5. **Look at your models.** If you use a larger model for small jobs, try a smaller one.

If something looks wrong, the request ID attached to each response is what [help](/help) will ask for.

## Where to go from here

- Read the controls in full in the [billing guide](/docs/billing).
- See live rates and the month estimator on [/pricing](/pricing).
- Find which screen answers which question in [usage and limits](/docs/usage-and-limits).
- Start with the basics in [Using DiCompute day to day](/blog/using-dicompute-day-to-day).
