---
title: "Attestation and the signed host report"
description: "What dico-agent reports about your machine, what the public attestation feed shows, and the honest limit of a self-signed claim."
date: 2026-10-11
authors: [DiCompute team]
tags: [providers, attestation, security]
categories: [providers]
cover: /blog-assets/blog/attestation-and-the-signed-host-report/banner.webp
coverAlt: "Duotone editorial illustration: a tilted orbit ring around a solid point, with a second point travelling the ring, picked out in accent; a cyan accent on a deep ink field."
---

Confidential computing and hardware attestation for AI workloads drew major industry investment in 2026. DiCompute's provider side has a much more modest mechanism today, and this post explains it plainly: what `dico-agent` tells the network about your machine, what the public attestation feed shows, and where the trust stops.

It is written for providers deciding whether to connect a box, and for anyone reading the feed. The short version: your agent signs a few facts about its host. A signature proves who said something, not that it is true. And no hardware-level proof exists in this codebase yet.

As always, the status line. Serving does not earn anything today, and the fleet path carries real traffic for one internal test account only. A newly connected worker at zero requests is normal. The facts below are from the [security model](/docs/provider/security-model) docs and the live public feeds as of this post.

## Why a network needs to know something about your box

Anyone can run a provider node, and nobody has to ask permission. That openness is the point, and it creates the central problem of any decentralized compute network: the coordinator is talking to a machine it has never met. It needs some way to answer basic questions. Is this the same machine as yesterday? Does it hold the key it claims? Is it running the release it says it is?

DiCompute answers those in layers. Some are cryptographic checks the coordinator performs itself. Others are statements the worker makes about itself, which the coordinator records but cannot confirm. The docs keep these two categories strictly apart, and that separation is the most useful thing to understand.

## The four signed host facts

When it connects, the agent sends a signed host report. It covers four facts:

1. **Secure boot** on or off.
2. **Disk encryption** on or off. The docs say the agent checks `fdesetup status` on macOS and scans for LUKS volumes with `lsblk` on Linux.
3. **OS and kernel**: the operating system type and release string.
4. **A hash of the agent binary.**

Two design choices are worth knowing. First, the report is tri-state. If your machine can't answer a question, for example a non-Linux host being asked about a Linux-only boot variable, the fact is left out, not sent as "false". A "false" would read as "checked, and it is off".

Second, you can see and decline it. `dico-agent status` prints a host-posture block showing whether the report is enabled and exactly which facts your next connection would sign. Setting `DICO_POSTURE_ENABLED=0` turns the whole report off, and `DICO_POSTURE_SECURE_BOOT=0`, `DICO_POSTURE_DISK_ENCRYPTION=0` or `DICO_POSTURE_OS_VERSION=0` drop one fact at a time. The report is on by default, so a fresh install sends it unless you change that.

## What a signature proves, and what it doesn't

The agent signs the report with the secp256k1 identity key it also uses for usage receipts. The docs state the limit in one sentence, and it's worth repeating: **a signature proves who reported these values, not that they are true.**

That sentence has real consequences. A signed "secure boot: on" from a machine means the machine holding that key said so. If someone modified the agent or ran it in a sandbox, they could sign anything. The docs call the host report "provider-supplied evidence about your own hardware, not a gateway-verified fact".

The same goes for other self-reported fields. The agent version, its declared capabilities and any data-handling claim are recorded as stated. The docs describe the zero-retention and data-collection declarations as self-asserted, with no canary or audit behind them, and give this reason for not building one: a check on the one telemetry channel that exists would pass an honest worker and a dishonest one identically, so it would only look like verification.

This is also why there is no promise of hardware-attested guarantees here. The docs say hardware attestation is deferred, partly because no attestable hardware is available across this fleet. We are not claiming a trusted execution environment, and a provider machine can read the prompts it serves.

## Public attestation: only what the coordinator checked

The coordinator publishes a public, unauthenticated feed at `GET https://dicompute.ai/v1/attestation` (note `/v1`, not `/openai/v1`). Anyone can read the trust state of workers without a key. It is built from an explicit allowlist of fields that the coordinator itself checked:

- the worker id, derived from and checked against the worker's public key;
- the trust level;
- the status: `online`, `offline`, or `untrusted` (connected, but failing challenges, which also removes it from routing);
- the worker's public keys and a signature binding them, which a third party can re-check offline;
- when the coordinator last got a valid answer from that key.

What the feed leaves out matters just as much. The agent version and capabilities are deliberately omitted, because a reader can't confirm them and might mistake them for checked facts. The host report is likewise not a field in this feed. An unknown worker id returns `404 unknown_worker`.

You can see it yourself:

```bash
curl -sS https://dicompute.ai/v1/attestation | jq '.data[0] | {status, trustLevel}'
```

## Trust tiers, and the aggregate

Trust comes in tiers. The docs say the worker-level tier is `self_signed` when the worker presented a key-binding signature that checked out, or `none`. They state outright that there is no "hardware" tier yet, because that would need a device-certificate verification pipeline that does not exist in the codebase.

`GET https://dicompute.ai/v1/providers/attestation` gives the aggregate. At the time of writing it reports six workers, all counted in a tier called `pinned` (the individual worker records I looked at show `self_signed`), and it shows `integrity_enforced: false`. That last field matters: a confirmed mismatch in a worker's code or weights degrades its routing, but the docs say excluding such a worker is off by default, behind two operator switches that ship disabled. Don't read the feed as saying integrity is enforced, because it isn't. The numbers there change, so check the feed rather than this post.

To see which of your own machine's facts the platform holds, sign in and open [/providers](/providers). The docs say it shows exactly what your machine reported.

## Periodic re-challenge

Proving who you are once isn't enough for a connection that stays open for days. On connect, the coordinator seals a random value to your public key and your agent has to decrypt it and answer. It repeats this on a timer, every five minutes by default. A worker that misses several in a row, three by default, has its connection closed, and while it is failing challenges its status reads `untrusted` and it is removed from routing.

This is a check that you still hold the key and the connection is live. The docs describe it as a challenge on the key, not a new measurement of your machine. The host report is attached again, freshly timestamped, each time the agent reconnects.

If your agent runs under your own key, protect `~/.dico/agent/identity.json` as the private key it is. Anyone who holds it can sign as you.

## Next steps

- [Security model](/docs/provider/security-model): the identity, challenge and posture sections in full, with the full list of what the agent sends.
- [Verifying what was served](/docs/verification): how a caller checks a fleet-served response.
- [/providers](/providers): what your own machine has reported.
- [Running a DiCompute provider node](/blog/running-a-dicompute-provider-node): the overview, including what isn't live.
