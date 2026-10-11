---
title: "How provider reputation is scored"
description: "Job success, uptime and challenge pass rate feed one score. How it's computed, and what the docs say about whether it changes your traffic."
date: 2026-10-11
authors: [DiCompute team]
tags: [providers, reputation, routing]
categories: [providers]
cover: /blog-assets/blog/how-provider-reputation-is-scored/banner.webp
coverAlt: "Duotone editorial illustration: a tilted orbit ring around a solid point, with a second point travelling the ring, picked out in accent; a cyan accent on a deep ink field."
---

Reputation systems for anonymous compute providers became a hot design topic
in 2026's DePIN projects. If strangers run your requests, you want a number that
says which ones to trust. DiCompute computes such a number for every worker.
This post walks through how, using the [reputation docs](/docs/provider/reputation),
and is clear about the part providers care about most: whether the score changes
how much traffic you get.

The short answer is that by default it does not. And, as with every provider
topic today, serving does not earn money by default yet, and the fleet carries
real traffic for one internal test account only, so a new worker has almost no
history to score.

## Why networks score providers

A coordinator that dispatches work needs some evidence about a worker beyond
"it connected". Did its past jobs finish? Does it stay online? Does it answer
the cryptographic challenges that prove it is still the machine it claims to be?
Does it start responding quickly? A composite score folds those answers into one
number between 0 and 1 that an operator, and the provider, can look at.

## The four inputs and their weights

The score blends four already-recorded inputs:

| Input | Weight | What it measures |
|---|---|---|
| Job success rate | 0.4 | Successful jobs divided by total jobs, over the worker's lifetime |
| Uptime rate | 0.3 | Real connect and disconnect history over a rolling window |
| Challenge pass rate | 0.2 | Challenges passed divided by passed plus failed, over the worker's lifetime |
| Responsiveness | 0.1 | An average of time to first chunk, scored against a 5-second ceiling |

For responsiveness, 0 means 5,000 ms or worse and 1 means 0 ms. The docs say
the weights match DiCompute's own reference composite and were not chosen
independently here.

Two details protect newcomers. Every input defaults to neutral, 0.5, and never
to zero, when there is no history. A brand-new worker that has run no jobs, has
no session history and has never been re-challenged scores exactly 0.5. A
worker still inside its ramp-up window also has its uptime term floored at 0.5.

One bounded penalty applies after the weighted sum: each disconnect classified
as an out-of-memory kill subtracts 0.05, capped at a total of 0.3. The docs call
the 5-second ceiling and the penalty size "stated placeholders pending real
fleet telemetry". They are not measurements.

## How uptime is measured

Uptime comes from real session history: connects and disconnects recorded by
the coordinator. The window is rolling, 24 hours by default, so a bad day ages
out. This is also why the ramp-up floor exists. A 24-hour uptime figure is not
meaningful for a worker that connected five minutes ago.

## Challenge pass rate and re-challenges

When your agent connects, it proves it holds its identity key. The coordinator
then keeps re-challenging the open connection: by default every five minutes,
it seals a fresh nonce to your public key and your agent has to decrypt and
answer it. Each outcome feeds the challenge pass rate. The
[security model](/docs/provider/security-model) adds the harder consequence: if
a worker misses three in a row by default, the coordinator closes the
connection, and a worker that stops answering shows as "untrusted" in the
public attestation status instead of silently staying "online".

## Does reputation change routing?

This is the question that matters for traffic, and the docs answer it exactly.
**Reputation-based routing is off by default.** With the switch unset, worker
selection is identical to the code path before reputation existed: your score is
computed and visible to you, but it does not decide which worker is picked.

An operator can turn it on. When enabled, each candidate worker's effective
concurrency is scaled by its score, with a floor of 0.2, before the normal
least-loaded selection runs. A low score makes a worker look fuller to the
scheduler, so it is deprioritized among otherwise eligible workers. The docs
call this "a preference, never a veto": a low-scoring worker is still
admissible, and if the score-adjusted pick would reject a request the plain
fleet could serve, routing falls back to the ordinary selection.

The docs explain why the default stays off. The mechanism is tested against a
live gateway. What is not yet established is that the placeholder constants hold
up as routing inputs at production scale. A recorded decision names the
blockers to clear before enabling it, including a replay against real fleet
traces and a way for the out-of-memory penalty to decay. We take the docs'
statement as the whole story. Nothing here promises a deployment will enable
it, and with traffic limited to one internal account, there is little for
routing to shape today.

You can see your own score, and which input costs you the most, on your worker
dashboard. [/providers](/providers) is where your machine's reports live.

## Practical ways to keep a healthy score

These follow from the inputs, and make no promise about traffic:

- **Keep the worker connected.** Uptime is 0.3 of the score and is measured
  from real session history. Run it under the service the agent can install, so
  a reboot does not leave a gap.
- **Do not overcommit memory.** An out-of-memory disconnect costs 0.05 each, up
  to 0.3. Pick a model and engine settings your box can hold. `dico-agent doctor`
  has a model-memory check for this.
- **Let challenges through.** Keep the clock accurate and the connection
  stable, because every challenge feeds both the 0.2 weight and the
  "untrusted" state.
- **Answer quickly.** Time to first chunk is 0.1 of the score. A slow first
  token hurts a little, and the ceiling is 5 seconds.
- **Do not game the number.** Several inputs are recorded server-side from real
  outcomes, not reported by your agent.

A public [leaderboard](/leaderboard) shows providers under a stable pseudonym,
so a good score does not reveal who you are.

## Next steps

- [Reputation and routing](/docs/provider/reputation): the source for every
  number in this post.
- [Security model](/docs/provider/security-model): the challenge mechanism and
  what the coordinator can verify.
- [/leaderboard](/leaderboard): the public view.
- [Running a DiCompute provider node](/blog/running-a-dicompute-provider-node):
  the full provider-side guide.
