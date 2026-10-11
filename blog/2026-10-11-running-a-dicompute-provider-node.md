---
title: "Running a DiCompute provider node"
description: "How the provider side works, from installing dico-agent to signed receipts and settlement, what it gives a GPU owner, and what is not switched on yet."
date: 2026-10-11
authors: [DiCompute team]
tags: [guides, providers, dico-agent]
categories: [engineering]
cover: /blog/running-a-dicompute-provider-node/opengraph-image
---

DiCompute has two sides. People and apps send requests to open AI models, and
providers, meaning anyone with a suitable machine, run the models that answer
them. This post covers the provider side: what you install, what happens once
it's running, how earnings are meant to be computed and checked, and what
you get out of it.

First, where things stand today. The [operate page](/operate) and the
[operator docs](/docs/provider) say it directly, and so does this post:

- **Every install step works**, and you end up with a real, linked,
  connected worker.
- **The fleet path carries real traffic for one internal test account only.**
  A newly connected worker sitting at zero requests is normal today. Widening
  that is work in progress.
- **Serving does not earn money by default yet.** Crediting has to be turned
  on by the deployment's operator, and the bank payout rail
  is not set up on dicompute.ai yet. You can check this yourself:
  `stripe_connect` reads `configured: false` in
  [/openai/v1/capabilities](/openai/v1/capabilities).

The rest of the post describes how it works and why it's built this way. Just
don't run a box expecting income from it this month.

## 1. Install the agent

On Linux or macOS, one line:

```bash
curl -fsSL https://dicompute.ai/releases/agent/install.sh | sh
```

On Windows, copy the PowerShell one-liner from [/download](/download).

The installer works out your OS and CPU, downloads the matching `dico-agent`
binary, and checks it against its published SHA-256 and a signed manifest
before running it. Prebuilt binaries cover seven targets: Linux, macOS and
Windows on x64 and arm64, plus Linux x64 with musl. The download page lists
each binary's checksum, so you can check a manual download yourself, and
[verified builds](/verified-builds) gives the exact command for each platform.
The macOS and Windows binaries are not yet signed by Apple or Microsoft, so
expect a Gatekeeper or SmartScreen warning if you download through a browser.
The download page explains how to check the file before you allow it.

## 2. Join

The installer goes straight on to run:

```bash
dico-agent join
```

`join` does the whole setup in one command:

- **Picks a model.** It chooses a published model, or uses the one you name.
- **Gets the weights.** It downloads them and checks their hashes.
- **Finds an engine.** If no inference engine is running on Linux or macOS, it
  installs a verified llama.cpp build and starts it. If you already run vLLM,
  SGLang, llama.cpp, Ollama or another OpenAI-compatible server, set
  `LOCAL_ENGINE` to point at it, and the agent wraps that engine instead.
- **Links the machine to your account.** It uses a device-code login, the
  RFC 8628 flow. The agent prints a link; you open it, sign in, and that's the
  approval. No pasted API key, and no DiCompute staff involved.

No minimum hardware spec is enforced. The agent reads your machine's real
memory headroom and advertises capacity to match.
[Hardware requirements](/docs/provider/hardware-requirements) separates what
the agent needs from what your engine needs.

## 3. Serve

```bash
dico-agent start
```

This opens an authenticated WebSocket to the coordinator and starts sending
heartbeats. Three mechanisms keep that connection trustworthy:

- **Proof of identity, and again later.** When it connects, the agent proves
  it holds its identity key. The coordinator keeps re-challenging the
  connection while it stays open, every five minutes by default, and drops a
  worker that misses several challenges in a row.
- **Signed heartbeats.** Each heartbeat carries a signed core: the worker's
  ID, its running and waiting request counts, a timestamp and its observed
  decode speed. The coordinator can therefore attribute load reports to a
  specific key.
- **A signed host report.** On connect, the agent also reports four facts
  about the machine, signed with its key: secure-boot state, disk-encryption
  state, OS and kernel, and a hash of its own binary. A signature shows who
  reported those values, not that they are true. The docs say so, and so do
  we.

The [security model](/docs/provider/security-model) lists every channel the
agent sends off your machine, what each one contains and how to opt out where
you can. Your [/providers](/providers) page shows exactly what your machine
reported.

## 4. Receipts: proof of what you served

Every request a worker serves produces a **usage receipt**, signed with the
worker's own key. The coordinator countersigns it and records it in its
journal. The receipt is the basic unit of the design, and everything later in
the payment pipeline is checked against it. It also means your earnings
record can be checked, rather than taken on trust.

On the consumer side, a fleet-served response carries its receipt, and
[verifying what was served](/docs/verification) shows how a caller checks it.
The public, unauthenticated `GET /v1/attestation` route publishes each
worker's trust state. It deliberately returns only fields the coordinator has
checked cryptographically, and leaves out anything the worker merely claims
about itself.

## 5. How earnings are computed and settled

The [claiming earnings](/docs/provider/claiming-earnings) guide sets out the
pipeline in six steps:

1. Your worker signs a receipt for each served request, and the coordinator
   countersigns and records it.
2. When a settlement epoch closes, the coordinator re-verifies every receipt
   in that window cryptographically.
3. Receipts are added up per worker into one payout. A dust floor is applied,
   and an audit manifest is written.
4. The per-worker payouts are combined into one Merkle root, committed
   on-chain in a single transaction.
5. Each worker's proof and the coordinator's signed attestation are published
   for that epoch.
6. You fetch your proof, check it, sign it and submit the claim.

Your rate is the model's listed price minus the platform fee, which is held
back at settlement. Once you're signed in, the **Your rates** card on your
fleet dashboard shows the gross rate, the fee and your net rate for each
model your workers offer. It also shows any scheduled rate change before it
takes effect. If you think a rate is wrong, you can submit a price
suggestion for operator review, and its status appears on the same dashboard.
See [provider pricing](/docs/provider/pricing).

And here is what is **not** live yet, stated as plainly as the guide states
it:

- **Fiat crediting is off by default.** It turns on when the operator sets up
  Stripe Connect bank payouts, or opts in explicitly
  ([decision 0106](/decisions/0106) records the gates). Payout then means
  Stripe-hosted onboarding and a withdrawal. That rail is not configured on
  dicompute.ai today, so withdrawals are not open.
- **The on-chain claim is a record, not a payment.** The settlement contracts
  are deployed on the XDC Apothem testnet only. A successful claim is
  verified, durable evidence of what you are owed, but nothing funds it yet.
  The guide says not to plan revenue against it, and neither should you.
- **Base rewards for uptime exist in code and are switched off.**
  [/openai/v1/base-rewards/status](/openai/v1/base-rewards/status) reads
  `{"enabled":false}` today.

The [earnings estimator](/earn) projects what serving could earn at the
current listed rate. It is labelled as a projection, not a payout, and you
enter your own measured throughput.

## The advantages, honestly

What running a node gives you, as built today:

- **Your hardware, your engine.** There's no list of approved machines and no
  required engine. Bring vLLM, SGLang, llama.cpp or Ollama, or let `join`
  install llama.cpp for you.
- **One command to start, and you don't need to ask anyone.** `join` handles
  the model, the weights, the engine and the account link, and approving the
  link is just your own sign-in.
- **Earnings you can audit.** Every served request leaves a signed,
  countersigned receipt. Payouts are built from re-verified receipts and a
  published Merkle proof, so you can check the arithmetic yourself instead of
  trusting a dashboard total.
- **Rates you can see in advance.** Gross, fee and net are shown for each
  model, and scheduled changes are visible before they land.
- **A pseudonym in public.** The public leaderboard shows a stable pseudonym
  for each provider, with no option to reveal who you are. The operator docs
  call this a commitment to providers.
- **Verified binaries.** Each download is checked against a published
  checksum and a signed manifest before it runs.

What to weigh before you connect:

- **No operator agreement yet.** No provider terms of service exist yet, so
  there is nothing to accept and no contractual clarity either way.
- **You can read what you serve.** That's unavoidable when you run an
  inference engine. Prompts reach your machine in plaintext.
- **Your identity key matters.** Anyone holding `~/.dico/agent/identity.json`
  can sign receipts as you, so protect it like a private key, because that's
  what it is.
- **Slashing exists only as a mechanism.** The code is there, nothing has
  ever been slashed, and no penalty terms have been agreed with providers.

## Next steps

- [/operate](/operate): the short version, with the current status at the top.
- [Provider quickstart](/docs/provider/quickstart): the full walkthrough.
- [Troubleshooting](/docs/provider/troubleshooting): when `dico-agent doctor`
  reports a problem, or a worker won't connect.
- [Reputation and routing](/docs/provider/reputation): how a worker's
  reputation score is computed, and whether it changes the traffic it gets.
