---
title: "Slashing explained, before you stake anything"
description: "What slashing covers, why nothing has ever been slashed, and the testnet and dry-run facts every provider should know first."
date: 2026-10-11
authors: [DiCompute team]
tags: [providers, slashing, staking]
categories: [providers]
cover: /blog-assets/blog/slashing-explained-before-you-stake-anything/banner.webp
coverAlt: "Duotone editorial illustration: a tilted orbit ring around a solid point, with a second point travelling the ring, picked out in accent; a cyan accent on a deep ink field."
---

Staking and slashing designs in decentralized AI networks drew scrutiny in 2026
after high-profile penalty disputes elsewhere. The complaint was rarely that a
penalty existed. It was that the people penalized had never been told, in
plain words, what could trigger one. This post is DiCompute's plain-words
version for providers, summarizing the [slashing docs](/docs/provider/slashing).

The status line first. **Nothing has ever been slashed on DiCompute, and
nothing can be yet.** The staking contract lives on the XDC Apothem testnet
only, where it holds faucet test value and no real funds. The component that
decides penalties ships in dry-run mode, so it works out and records every
decision but sends nothing. A new worker also sits at zero requests today,
because the fleet path carries real traffic for one internal test account only
([operate page](/operate)). None of that is a fault. It is simply where the
network is.

If you want the wider picture of the provider side, start with
[Running a DiCompute provider node](/blog/running-a-dicompute-provider-node).

## Why penalties exist in compute networks

A network that routes requests to machines other people own needs some way to
discourage a machine that accepts work and then disappears. A stake is the usual
tool: you lock a deposit, and a documented misbehavior can cost you part of it.

The trade-off is trust. A penalty system that can take value on the strength of
an automated judgment is a real term of the network, not an implementation
detail. The slashing page says so itself and tells you to weigh it the same way
you weigh the missing operator agreement (more on that below).

## The short version: nothing has been slashed, and nothing can be yet

Three facts sit behind that sentence, all from the
[slashing docs](/docs/provider/slashing):

- **Testnet only.** The staking contract is deployed to XDC Apothem (a test
  network), not to mainnet. There are no real funds in it.
- **Dry-run by default.** Even once a live deployment exists, the slasher
  computes and audits every decision but sends no transaction unless an operator
  explicitly turns it on.
- **Zero history.** The docs state that nothing has ever been slashed.

You can read the same posture in the
[provider guidelines](/docs/provider/guidelines): "slashing exists as a
mechanism though nothing has ever been slashed."

## What slashing covers: availability and delivery, not correctness

The mechanism looks at one question: did your worker answer its heartbeats on
time? That is availability. The docs are explicit that it is **never** about
output quality. Language model output is not deterministic, so "the answer was
wrong" is a different problem, and the contract's own header says that
stretching slashing to cover it would be the wrong direction.

How the check works, in operator terms:

- **Evidence.** Your worker's connect and disconnect history, as the gateway
  recorded it. A reconnect that overlaps the close of an old socket is not
  counted twice.
- **Window.** Decisions are made per worker over a detection window, one
  decision per window.
- **Absence of evidence is not downtime.** A worker with no session history in
  the window is never slashed. A gateway that lost its database looks the same
  as a worker that never existed, and the slasher treats both as "no evidence".
- **Short blips are tolerated.** A reconnect gap below a grace period does not
  count against you.
- **No double jeopardy.** The incident id comes from the worker and the window,
  so the contract's replay protection refuses a duplicate for the same window.
- **Zero stake, nothing taken.** If your staked balance is zero, no transaction
  is sent. The window is recorded as skipped, so it stays punishable if you
  stake later rather than being quietly forgiven.

The docs list default values for the threshold, grace period and per-incident
amount, and they describe the amount as a starting point the operating
deployment may change. This post does not repeat those numbers on purpose:
they are defaults in a dry-run system, and the page itself is the source to
check, not a blog post that could go stale.

There is also a fleet-wide circuit breaker. If a policy bug made every worker
look offline at once, a per-run cap stops the first pass from penalizing
everyone, and over-cap incidents are deferred rather than dropped.

## Testnet-only staking and the dry-run slasher

Put together, this is what you can and cannot do today:

| Question | Answer today |
|---|---|
| Is there a staking contract? | Yes, on XDC Apothem testnet |
| Does it hold real value? | No, faucet test value only |
| Is it on mainnet? | No |
| Does the slasher send transactions? | Not by default; dry-run unless an operator enables it |
| Has anything been slashed? | Never |

You do not need to stake to connect a worker. Joining, linking and serving
work as described in the [provider guide](/blog/running-a-dicompute-provider-node).

You can see your own record in the console at `/slashing`, which reads only
your own workers. It shows the scope statement (availability only, correctness
slashing out of scope), every slashable-action row for your workers with its
window and measured uptime, any deferred incident, and your most recent
evaluation even when it was clean. It does no chain I/O, so it works when the
chain is down. The raw connect and disconnect history behind it is also listed
in [what the coordinator records about your worker](/docs/provider/data-recorded),
which gives its retention.

Reputation is a separate system: a behavior score, not a stake. The docs point
to [reputation and routing](/docs/provider/reputation) for what it covers.

## The appeal path the docs describe

There is **no on-chain appeal**, dispute window or bonded challenger today. The
contract's header defers that as future, separately designed work. The docs
choose to say this plainly rather than imply a process that does not exist.

The path that does exist is human and off-chain: you dispute through the normal
support channel, and an operator reconstructs the incident from the audit row
and the gateway's own session history. If the slasher was wrong, the remedy is
a manual make-good plus a policy fix, not an automated reversal. To prepare for
that conversation, learn the support flow in advance; the
[guidelines](/docs/provider/guidelines) and the logs workflow in the docs
cover how to send a redacted log bundle.

A mechanism that can take stake with no automated appeal is worth weighing
before you ever stake. That is the point of the page.

## No operator agreement yet

The docs also say that there is no provider terms of service or operator
agreement yet. Nothing in the guidelines creates a contract. They describe what
the software enforces and what the project expects. So a penalty rule is
documented, but the legal terms around it are not written. Treat that as an open
item, and don't read "documented" as "agreed".

## Next steps

- Read the [slashing docs](/docs/provider/slashing) in full before you stake
  anything, once staking is something you can do.
- Skim the [provider guidelines](/docs/provider/guidelines) for the rest of the
  ground rules.
- Review the end-to-end provider flow in
  [Running a DiCompute provider node](/blog/running-a-dicompute-provider-node).
- Check the [operate page](/operate) for what is live today.
