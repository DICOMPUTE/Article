---
title: "Staying pseudonymous as a provider"
description: "The public leaderboard and node explorer show a stable pseudonym, never your identity. What's public, what operators see, and what to keep private."
date: 2026-10-11
authors: [DiCompute team]
tags: [providers, privacy, leaderboard]
categories: [providers]
cover: /blog-assets/blog/staying-pseudonymous-as-a-provider/banner.webp
coverAlt: "Duotone editorial illustration: a tilted orbit ring around a solid point, with a second point travelling the ring, picked out in accent; a cyan accent on a deep ink field."
---

Pseudonymity for infrastructure contributors became a valued feature in 2026's
decentralized networks. People who run a node at home or in a lab often want
the network to know their machine, not them. This post separates three things
that are easy to blur: what the public can see, what DiCompute's operators can
see, and what only you control.

The honest limit comes first. Pseudonymous is not anonymous. The public pages
show a stable pseudonym instead of your name, and the docs spell out what they
withhold. But the people who operate the coordinator can see considerably more,
and the machine you run reads the prompts it serves. Nothing below promises
anonymity from DiCompute's operators. Also, as always today, a newly linked
worker sits at zero requests, because the fleet path carries real traffic for
one internal test account only ([operate page](/operate)).

For the install and serve flow, see
[Running a DiCompute provider node](/blog/running-a-dicompute-provider-node).

## Why provider privacy matters

A provider's machine is a real piece of someone's home or lab network. A public
list tying it to a person could expose where it runs, what it is, and when it
is online. The design answer in the docs is to publish activity and health,
keyed by a stable pseudonym, and to keep identity and wallet details off the
public pages.

## The public leaderboard's stable pseudonym

The [leaderboard](/leaderboard) describes itself as a snapshot of real activity,
"not a guarantee of future earnings or a ranking promise". Providers appear
pseudonymously, with "no wallet or worker identity" leaking, and only once they
have served enough real requests to be a meaningful signal. Rows show a name
like `worker-` followed by a short hash, and "stable" means the same provider
keeps the same pseudonym over time, so you can build a track record without a
name attached.

Stable also means linkable. Anyone can see that `worker-…` today is the same
`worker-…` as last week. If you ever publicly claim a pseudonym ("that's mine"),
you have tied it to yourself permanently. That choice is yours to make or not.

## /providers/explore: what a stranger can see

The [node explorer](/providers/explore) needs no account. For each node it shows
a shortened worker id, whether it is online or offline, its trust tier, and when
it was last verified. The page labels identity as "Pseudonymous". It also shows
network-wide model prices and available capacity, and says these are totals,
not any single provider's numbers.

What a stranger does not get: your name, your account, your wallet, your IP
address or your hardware list. Note the trust label: `self-signed` means the
node vouches for itself, not that anyone else has checked it.

## Country-level aggregates and the per-country privacy floor

Fleet geography follows a simple rule: small groups are withheld. The public
fleet-geography feed reports counts per country, and countries with too few
providers are folded into a combined bucket instead of being listed alone. The
explorer applies the same idea to availability: the page says the figure is
"shown once enough providers are online to keep each one anonymous", and until
then it publishes nothing. Usage share works the same way: models with very few
requests are grouped as withheld "to protect small accounts".

The practical lesson is that a lone provider in a small country does not show up
as an individual country entry. Don't read this as a guarantee, though. As
more providers join, the thresholds are met and more detail appears. The numbers
change, so this post doesn't quote them.

## What DiCompute operators can see

The [data-recorded docs](/docs/provider/data-recorded) list what the
coordinator stores keyed to your worker:

- A **fleet roster** snapshot from your last hello: hardware summary, agent
  version, trust tier, wallet address and last-seen time.
- **Connect and disconnect history**: one row per connection, kept for a default
  retention period.
- **Reputation counters**: job counts and response timing, kept indefinitely
  by worker id.
- **Log bundles** you choose to upload, with a stated retention.
- **Served-request outcomes**: timestamps, model, final status and error class.
- A **wallet address pin**. Your worker signs a binding between its id and a
  wallet address at hello time. The
  [security model](/docs/provider/security-model) says plainly that this
  link is permanent on the platform side, and that if the wallet is a public
  chain address, anyone can correlate it. It is linkable, even though your
  serving identity has more protection.

Your network address is used in memory for rate limits and for admission checks at
the WebSocket connection, and
the data-recorded page says it is never written to a structured log line or a
durable store.

Two more facts to keep in mind. First, prompts reach your machine in plaintext:
the docs say that anyone who operates the box can read every prompt it serves,
and there is no mechanism that changes that. Don't present your node to anyone
as unable to see traffic. Second, whoever operates the coordinator can see
the records above. "Pseudonymous to the public" is a different claim from
"hidden from DiCompute".

## Opsec habits: hostnames, logs, shared screenshots

Most identity leaks happen at the edge of your own setup:

- **Hostnames and paths.** `agent.log` can contain your engine and coordinator
  URLs. The log uploader masks your local username, home directory and
  private-network hostnames and addresses, but the docs call that redaction a
  floor, not a guarantee. Run `dico-agent logs upload --dry-run` and read the
  output before you send anything. The
  [sharing-logs docs](/docs/provider/sharing-logs) explain what it removes.
- **Screenshots.** A terminal showing your hostname, username or paths gives away
  more than the pseudonym hides. Crop or redact before you post.
- **`identity.json`.** It holds your private keys. Anyone with it can sign
  receipts as you, so guard it like any key. See the
  [security model](/docs/provider/security-model) for how it is stored and the
  option to protect it with a passphrase.
- **See for yourself.** `dico-agent data` lists every file the agent has
  written, with size and age, and never prints content. It is made for exactly
  this kind of privacy review.
- **One wallet, one history.** Because the wallet link is permanent, decide
  deliberately which wallet address you present.

## Next steps

- Read [what the coordinator records about your worker](/docs/provider/data-recorded).
- Read the [security model](/docs/provider/security-model) end to end.
- See what is public: the [leaderboard](/leaderboard) and the
  [node explorer](/providers/explore).
- Return to [Running a DiCompute provider node](/blog/running-a-dicompute-provider-node)
  for the overall picture.
