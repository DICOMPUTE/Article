---
title: "The honest math of putting an idle GPU to work"
description: "Revenue, electricity and utilization: how to reason about serving inference on your own hardware, and why DiCompute shows a projection, not a payout."
date: 2026-10-11
authors: [DiCompute team]
tags: [providers, economics, earn]
categories: [providers]
cover: /blog-assets/blog/the-honest-math-of-renting-out-an-idle-gpu/banner.webp
coverAlt: "Duotone editorial illustration: a tilted orbit ring around a solid point, with a second point travelling the ring, picked out in accent; a cyan accent on a deep ink field."
---

Putting idle GPUs to work through decentralized compute networks was one of the
most-searched AI-hardware topics of 2026. Most of those pages end in a slogan
and a screenshot. This one ends in arithmetic, and the arithmetic comes with a
caveat you should read first.

**Serving on DiCompute does not pay you today.** The [operate page](/operate)
says so, and so does the [earnings estimator](/earn): it is "a projection, not
a payout". This post explains how to reason about the numbers so you can decide
for yourself whether a node is worth running now, later, or not at all.

## Why "earn from your idle GPU" needs a calculator

A GPU that sits idle costs you nothing extra to own. A GPU that is online and
serving costs electricity, and the revenue depends on three things you control
only partly: how fast your hardware generates tokens, how much of the time
someone is actually sending it work, and the rate the network lists for the
model you serve. A slogan hides all three. A calculator makes you type each one
in, and it should make you type in your own guesses rather than a flattering
default.

## Where things stand

The current state, from the [operate page](/operate) and the
[claiming-earnings guide](/docs/provider/claiming-earnings):

- **Crediting is off by default.** Turning receipts into money has gates, in
  order. The deployment's operator switches crediting on. Your worker must be
  linked to your account. Then you complete onboarding and make a withdrawal.
  Decision 0106 records these gates.
- **Withdrawals are not open.** `stripe_connect` reads `configured: false` in
  [/openai/v1/capabilities](/openai/v1/capabilities).
- **The fleet carries real traffic for one internal test account only.** A new
  worker that sits at zero requests is the normal state today, not a fault.

So every figure below is an input to a projection, never a record of income.

## The estimator's formula

The [/earn](/earn) page states its method in plain terms. Monthly tokens are:

```text
tokens per month = throughput (tokens/sec) x hours online per day x 30 x utilization
```

(Strictly, throughput in tokens per second also needs a seconds-per-hour
conversion of 3,600 to get from hours to tokens.) Revenue prices those tokens
at the reference model's current listed output rate, read live from the pricing
feed. For `qwen2.5-3b-instruct`, [/openai/v1/models](/openai/v1/models) listed
$0.20 per million output tokens on the day this post was written. Check it
live, because prices can change. The page then subtracts a platform fee held
back at settlement, and shows gross, fee and net. This post does not quote a
fee, because no fee figure is settled. Treat the net as a ceiling.

Everything except the rate is your own number: throughput, hours online,
utilization (the share of online time you are actually serving), power draw
and your electricity rate. DiCompute "doesn't set or promise a utilization
rate", in the page's words. With only one internal account on the fleet today,
your honest utilization guess for a new worker may well be zero.

## Electricity runs while you are idle

The estimator's electricity line is the part slogans skip:

```text
electricity per month = watts x hours online per day x 30 x your rate per kWh
```

It is "billed for the whole time you're online (idle draw still costs money),
not scaled down by utilization". That asymmetry matters. Revenue scales with
how busy you are. Electricity scales with how long the machine is on.

A unit check with made-up round numbers, to show the shape and not to suggest
a real card: a box that averages 300 watts, online 24 hours a day for 30 days,
uses 300 x 24 x 30 = 216,000 watt-hours, which is 216 kWh. Multiply that by
your own tariff. Revenue, by contrast, gets multiplied by utilization, which
today may be near zero.

When we loaded the estimator with its default inputs on 2026-10-11, the
projected net for the default reference model was negative: electricity was
larger than revenue. We are not quoting the figures, because they come from
defaults the page chooses and not from anything you measured. The lesson is
the sign. A box serving a small model at modest utilization can cost more to
keep online than it earns, even in a projection.

## Replace guesses with a benchmark

Throughput is the input people most often get wrong, because they quote a
spec-sheet number or a figure from someone else's setup. The `dico-agent`
CLI has a `benchmark` command that measures your own engine on your own
hardware. The [/earn](/earn) page tells you to run it, then come back and
re-run the estimate. Measure watts at the wall with a plug-in meter during the
same run, and put a real number in the power field too.

There is no fixed device list in the estimator. The page says the real capacity
model is bring-your-own-engine, so your measured throughput is the input. A
separate table on the page, "Recognized hardware", lists the capacity class
each GPU model is recognized for. That table does not feed the estimate, and
the page is candid that nothing checks your machine against it yet.

## What would change the picture

Three gates, in the order the guide lists them: the deployment's operator
enabling crediting, your worker being linked to your account, and the
withdrawal rail being configured. Nothing here predicts when or whether that
happens. Base rewards, a guaranteed uptime floor, are also off, and the page
says no floor is configured.

Separately, traffic has to reach your worker. Today the fleet path serves one
internal test account, so even with every gate open, revenue needs more demand
than exists right now.

## Who should run a node today anyway

Run a node today if you want to learn how provider software works, test your
hardware and engine, help shake out the install path on your platform, or be
connected and ready if the gates open. You get a real, linked, connected
worker, and a signed receipt for each request it serves, if any arrive.

Do not run one to cover your electricity bill. If you are weighing it
financially, the estimator's projection is your upper bound, and the actual
figure today is zero.

## Next steps

- [/earn](/earn): the estimator. Enter your own numbers.
- [/operate](/operate): the current status, at the top.
- [Claiming your earnings](/docs/provider/claiming-earnings): the settlement
  design, and what is still missing.
- [Running a DiCompute provider node](/blog/running-a-dicompute-provider-node):
  the full provider-side guide.
