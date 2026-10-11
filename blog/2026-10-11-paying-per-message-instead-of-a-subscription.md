---
title: "Paying per message instead of a monthly AI subscription"
description: "How pay-as-you-go AI works on DiCompute: per-token prices, the $0.0001 minimum, reserve-then-settle, and how to estimate a month before you spend."
date: 2026-10-11
authors: [DiCompute team]
tags: [billing, pricing, cost-control]
categories: [product]
cover: /blog-assets/blog/paying-per-message-instead-of-a-subscription/banner.webp
coverAlt: "Duotone editorial illustration: a tilted orbit ring around a solid point, with a second point travelling the ring, picked out in accent; an amber accent on a deep ink field."
---

AI subscription prices kept climbing through 2026, while metered access to open models stayed cheap enough to count in fractions of a cent. So a fair question has come up: do you really want a flat monthly fee, or would you rather pay for what you use?

This post explains how pay-per-use works on DiCompute, using the real mechanics from the [pricing page](/pricing) and the [billing guide](/docs/billing). It doesn't compare DiCompute with any named subscription, because the two products differ in too many ways for a fair price comparison. You get the mechanics and a way to estimate your own month, and then you decide.

## Flat subscriptions versus paying for what you use

A subscription charges the same amount every month. Light months cost the same as heavy ones, which is simple, but you pay whether or not you chatted.

Pay-per-use charges for the work done: you add credit, and each request draws it down. The trade-off is that your spending moves with your habits, so you want to know how it is calculated and what controls you have. This post is about the arithmetic. The controls are covered in the [billing guide](/docs/billing).

On DiCompute you add credit to your account and each request draws it down. There is one self-serve plan, and the [pricing page](/pricing) lists auto-reload, spend limits and alerts as included on it.

## What a token is, and why prices are per million

AI models don't read words, they read **tokens**: pieces of text, roughly a short word or part of a longer one. Your message is counted in tokens on the way in, and the reply is counted on the way out. You pay for both, at separate rates.

Prices are quoted per **million** tokens because a single token costs a tiny fraction of a cent. As of this post, the [pricing page](/pricing) lists `qwen2.5-3b-instruct` at $0.05 per million input tokens and $0.20 per million output tokens, and `ternary-bonsai-2-27b` at $0.20 and $0.60. Those figures can change, and the pricing page reads them live from the model catalogue, so check it for today's rates. The [token counter](/tools/token-counter) shows how many tokens a piece of text is, in your browser, without sending the text anywhere.

DiCompute tracks money in micro-dollars (µUSD). One µUSD is $0.000001. That lets a very small charge be exact, with no rounding up to a credit pack.

## Reserve, then settle

Before a request runs, DiCompute can't know exactly how long the reply will be. So it **reserves** the worst case: the cost of your input plus the most output you allowed. When the reply finishes, the request is **settled** at what was actually used, and the difference goes back to your balance straight away.

You may notice your balance dip a little further while a long reply is being written, then recover when it ends. That is the reserve at work. The final charge is the settled amount. In the unusual case where actual usage runs past the estimate, the overage is capped at twice the reservation, and your receipt flags it.

## The $0.0001 minimum per request

Every request has a minimum charge of $0.0001 (100 µUSD), according to the pricing page. Very short exchanges cost that floor rather than their true token cost. The billing guide gives an example: a ten-token prompt with a twenty-token reply truly costs about one µUSD, and is billed the minimum.

The floor matters only for tiny requests. A request of 500 input and 200 output tokens on `qwen2.5-3b-instruct` comes to 65 µUSD by the per-token rates, so it settles at the 100 µUSD floor. Longer requests cost more than the floor, and then the per-token rates decide.

## Estimating a month with the calculator

The [pricing page](/pricing) has a month estimator. Pick a model, enter how many tokens you send and receive per request and how many requests you make in a month, and it shows the cost at the model's current listed rate, including any adjustment for the minimum.

Here is the arithmetic done by hand, using the listed rates above, so you can check the calculator against it. These are worked examples, not predictions of your usage:

- **100 short chats a month on `qwen2.5-3b-instruct`.** Each is about 500 tokens in and 200 out. Each settles at the $0.0001 floor, so the month comes to $0.01.
- **300 longer requests a month on `ternary-bonsai-2-27b`.** Each is about 2,000 tokens in and 500 out. Input costs 2,000 × $0.20 per million, which is $0.0004. Output costs 500 × $0.60 per million, which is $0.0003. That is $0.0007 per request, so the month comes to $0.21.

To price a single request before you send it, the billing guide also describes a free estimate route for developers. If you only chat in the console, the calculator is enough.

## Topping up with Stripe checkout

To add credit, open Settings → Billing and choose **Add credit**. This takes you to a Stripe checkout, and back to the console once the payment settles. The lowest and highest top-up amounts are set by the service and listed in the [billing guide](/docs/billing). The same flow is reachable from a low-balance prompt in the chat.

## Who pay-per-use suits

It tends to suit you if:

- You use AI in bursts, some weeks heavily and some not at all.
- Your tasks are short: rewording, quick questions, brainstorming.
- You like seeing exactly what each request cost.
- You would rather set a ceiling than commit to a monthly amount.

It may not suit you if:

- You want a bill that never varies. A flat fee is more predictable, even if you pay for unused months.
- You want one particular closed model. DiCompute's catalogue is open models only, so check [/models](/models) first.
- You need a model that isn't accepting requests right now. Some larger models are listed but not accepting requests today.

Either way, most models here are small open models, so judge them by the tasks you give them, and check answers that matter.

## Where to go from here

- See live rates and run the month estimator on [/pricing](/pricing).
- Read the full mechanics in the [billing guide](/docs/billing).
- Start with the basics in [Using DiCompute day to day](/blog/using-dicompute-day-to-day).
- Look up what a request cost, and your spend history, in the [billing guide](/docs/billing).
