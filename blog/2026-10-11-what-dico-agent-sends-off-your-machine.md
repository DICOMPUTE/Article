---
title: "What dico-agent sends off your machine"
description: "Every channel the agent uses, what the coordinator records about your worker, opt-in telemetry, and why you can read the prompts you serve."
date: 2026-10-11
authors: [DiCompute team]
tags: [providers, privacy, security]
categories: [providers]
cover: /blog-assets/blog/what-dico-agent-sends-off-your-machine/banner.webp
coverAlt: "Duotone editorial illustration: a tilted orbit ring around a solid point, with a second point travelling the ring, picked out in accent; a cyan accent on a deep ink field."
---

Privacy on distributed compute nodes, in both directions, was a frequent concern in 2026's decentralized-infrastructure debates. A provider has two worries: what the software on my machine tells the network, and what the network's users send through my machine. This post answers both from the operator docs, before you install anything.

The short version: the agent sends a small, documented set of messages to the coordinator, most of which you can switch off, and none carries prompt or reply content. But the prompts you serve do arrive on your machine as readable text, and you are responsible for that. Nothing here is a reason to expect traffic, either. Serving earns nothing today, and the fleet path carries real traffic for one internal test account only.

This post summarizes the [security model](/docs/provider/security-model), [what the coordinator records](/docs/provider/data-recorded) and [install telemetry](/docs/provider/install-telemetry) pages. Those pages are the source of truth, and they change.

## Why this question comes before installing

Running an inference node means trusting a program to run on your hardware and talk to a server you don't control. Sensible operators ask what it sends before they run it. The agent docs agree: the security model has a table of every channel, and the docs' own drift tests check that each opt-out setting it names is still parsed by the agent, so the table doesn't quietly go stale.

You can also check on your own box. `dico-agent data` lists every file the agent writes, with size and age but never contents, and `dico-agent status` prints the host-report facts your next connection would send.

## Heartbeats and the host report

Per the channel table, these leave your machine:

| Channel | When | What it carries | How to opt out |
|---|---|---|---|
| Hello and heartbeat | On connect, then each heartbeat | Signed core: worker id, running and waiting request counts, timestamp, observed decode speed (only once real work has happened). Unsigned extras: free memory, GPU temperature, model-ready flag, cache slot counts. | None. It keeps the connection alive. |
| Request-integrity counters | With each heartbeat | Counts such as requests served, tokens generated and cancellations. "Never request content", and reset on restart. | None. |
| Host report | On every connect | Secure boot, disk encryption, OS and kernel, signed. A fact the machine can't answer is left out. | `DICO_POSTURE_ENABLED=0`, or one fact at a time. |
| Request-lifecycle events | Per request, at five points | Event name, trace and request ids, timing metadata. "Never prompt or completion bytes". | `DICO_REQUEST_LOG_EVENTS=off` |
| Update and crash reports | On a self-update, rollback or crash loop | Worker id plus version and build identifiers. | None. |
| Log bundle | Only when you run `dico-agent logs upload` | A compressed tail of the agent log. | Never sent unless you run it. |

Connecting also sends your chosen payout wallet address and a signature binding it to your worker id. That is why the docs say the platform links your worker to your wallet from your first connection, before anything is paid. The host report itself is explained in the security model docs.

## What the coordinator stores about your worker, and for how long

The [data-recorded page](/docs/provider/data-recorded) lists the coordinator's worker-keyed stores:

- **Fleet roster:** hardware summary, agent version, trust tier, payout wallet address and last-seen time. The docs say an idle worker is evicted from it once it has been idle for a day and the roster is over its size cap.
- **Connect and disconnect history:** one row per connection, kept 90 days by default.
- **Reputation counters:** job totals, successes and a time-to-first-token average, kept indefinitely, keyed by worker id.
- **Log bundles you uploaded:** the newest five per worker, nothing older than 30 days.
- **Served-request outcomes:** timestamps, model, final status and error class, kept 30 days by default. These are outcomes, not content.
- **Payout address pin:** kept without a time limit.

Your network address is used in memory for rate limiting and admission checks. The docs say it is never written to a log line or to any durable store listed above. Retention periods are operator-tunable defaults, so read the page for current values.

## Install telemetry: opt-in only

The installer sends one event to the coordinator, but only if you ask. Set `DICO_INSTALL_TELEMETRY=1` before running the installer. With no variable set, nothing is sent. The event holds an outcome, the install phase reached (one to seven), the step name, a platform string such as `linux-x64`, the install method, a duration, a timestamp and the agent version. The docs list what is excluded: no account id, IP address, hostname, username, file paths, environment variables, model names, hardware specifics or error messages. Delivery is fire-and-forget, so a failure never blocks the install.

The login step has its own funnel record, but the docs say it is written to your own `agent.log` only. It makes no network call.

## Prompts arrive in plaintext on your box: a responsibility

This is the part to read twice. The security model docs say your worker decrypts each request's plaintext prompt to hand it to your local engine, and that the plaintext sits in your process's memory. Protection on the coordinator link covers the prompt in transit, "not from whoever operates the box". If you are the operator, you can read every prompt your worker serves. The docs add that no trusted-execution mechanism exists in the codebase that changes this.

It cuts both ways. The people sending requests are told the same thing: the platform's [llms.txt](/llms.txt) says there is no privacy moat in v1, the platform's own coordinator can read prompts and replies, and no model offers zero data retention. The [verification docs](/docs/verification) cover what a caller can check.

What that means for you:

- Treat what passes through the engine as other people's data. Don't log prompts, and don't point `LOCAL_ENGINE` at a shared box you don't control.
- The hop from agent to engine carries decrypted prompts. The quickstart recommends a same-box engine over a unix socket or loopback with `LOCAL_ENGINE_TOKEN` set. A remote engine must use `https://`, and plain `http://` to a non-loopback host is refused unless you set `DICO_ALLOW_REMOTE_ENGINE=1`, which the docs call a deliberate, dangerous opt-in.
- There is no signed provider agreement yet, so nothing defines your obligations or the platform's. Weigh that before you connect.

## Protecting identity.json

`~/.dico/agent/identity.json` holds both private keys: the one that decrypts prompts and the one that signs receipts. Anyone who can read it can act as your worker. By default it is a plain file protected by file permissions. The docs describe optional passphrase encryption at rest with `dico-agent identity encrypt`, and an encrypted backup with `dico-agent identity export`. Two caveats from the docs: the passphrase file sits next to the key by default, so it only helps against a leak that reaches one file and not the other, and a lost passphrase means a new worker identity.

If the file is lost without a backup, the next start creates a new worker id, and the coordinator refuses a changed key for an old id until an operator investigates. To retire a box, `dico-agent purge` removes the identity, credentials, journal and cache, but it can't reach a backup you copied elsewhere.

## Where to check what your machine reported

Sign in and open [/providers](/providers) to see what your machine has reported. On the box, use `dico-agent status` for the host-report block, `dico-agent data` for the file inventory and `dico-agent doctor` for health checks. For coordinator-side records, the [data-recorded page](/docs/provider/data-recorded) is the reference. If something looks wrong, say so on the project's public issue tracker.

## Next steps

- [Security model](/docs/provider/security-model): the channel table, identity and key handling.
- [What the coordinator records](/docs/provider/data-recorded): stores and retention.
- [Install telemetry](/docs/provider/install-telemetry): exactly what the opt-in event contains.
- [/providers](/providers): your machine's own reports.
- [Running a DiCompute provider node](/blog/running-a-dicompute-provider-node): the full overview.
