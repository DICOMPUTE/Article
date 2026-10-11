---
title: "How epoch settlement and Merkle proofs work"
description: "From receipts to a single on-chain root: the six-step settlement design, how you verify your own proof, and why it's testnet-only today."
date: 2026-10-11
authors: [DiCompute team]
tags: [providers, settlement, xdc]
categories: [providers]
cover: /blog-assets/blog/how-epoch-settlement-and-merkle-proofs-work/banner.webp
coverAlt: "Duotone editorial illustration: a tilted orbit ring around a solid point, with a second point travelling the ring, picked out in accent; a cyan accent on a deep ink field."
---

On-chain settlement for decentralized compute marketplaces was a leading crypto-AI topic in 2026. DiCompute has a settlement pipeline built around that idea, and this post explains how it works for a technical provider: epochs, aggregation, Merkle roots, proofs and claims.

Read this part first, because the design is further along than the money. The settlement contracts are deployed on the **XDC Apothem testnet only**, and there is no mainnet deployment. A claim is **a record, not a payment**: the [claiming guide](/docs/provider/claiming-earnings) says the on-chain balance a claim credits has no withdrawal function, no funding source and no treasury behind it, and tells you not to plan revenue against it. Separately, the fleet path carries real traffic for one internal test account only, so a new worker has no receipts to settle yet. Everything below works, in the guide's phrase, "over an empty input".

So this is an explanation of a design you can inspect, not a way to get paid. For the rest of the provider side, see [Running a DiCompute provider node](/blog/running-a-dicompute-provider-node).

## Why batch payments into epochs

Imagine paying a provider for each request it serves. Each payment would be tiny, and each on-chain transaction costs gas. The cost of recording one request could exceed the request's value.

An epoch is a fixed settlement window. Instead of one transaction per request, the coordinator closes a window, adds everything up and commits one summary to the chain. The guide says this changed during development: the Merkle leaf used to be one per request, "each worth a fraction of the gas needed to claim it", and is now one per worker per epoch. You serve one request or ten thousand, and you claim once.

A consequence the guide spells out: small epochs carry over instead of paying out. If a worker's total for an epoch is below a minimum, it gets no leaf, and the amount rolls into the next epoch's input until it crosses the line. The guide says that "nothing to claim" for several epochs in a row is the system working, not a bug.

## The six steps, from receipt to claim

The claiming guide sets out the pipeline in six steps:

1. **Receipt.** Your worker signs a usage receipt for each request it serves. The coordinator countersigns it and records it in its journal.
2. **Re-verification.** When an epoch closes, the coordinator re-checks every receipt in that window cryptographically.
3. **Aggregation.** Receipts are added up per worker into one amount. A minimum floor is applied, and an audit manifest is written.
4. **Commitment.** The per-worker amounts become one Merkle root, committed on-chain in a single transaction.
5. **Publication.** Your proof and the coordinator's signed attestation are published for that epoch.
6. **Claim.** You fetch your proof, check it, sign it and submit the claim.

A few conditions apply. A worker with no registered payout wallet is left out of settlement entirely, with no leaf at all, so register one before you expect anything to settle (the [quickstart](/docs/provider/quickstart) shows `dico-agent config set AGENT_WALLET_ADDRESS`). Registration is write-once: the coordinator pins the first address it sees for the worker, and a different address on a later connection is refused. Your amount is also the listed price net of the platform fee held back at settlement. The Your rates card on your fleet dashboard shows gross, fee and net per model, so this post doesn't repeat any rate.

Uptime rewards, the optional "base rewards", exist in code and are switched off. [/openai/v1/base-rewards/status](/openai/v1/base-rewards/status) reads `{"enabled":false}`.

## Merkle roots in one paragraph

A Merkle tree is a way to commit to a long list with one short value. Hash each entry, which gives the leaves. Hash the leaves in pairs, then hash those results in pairs, and keep going until one hash is left: the root. Publish only the root. To show that your entry is in the list, someone gives you your leaf plus the handful of "sibling" hashes along the path to the root. Anyone can recompute the path and compare the result with the published root. Change one amount or one address and the root no longer matches. The chain stores one root per epoch, however many workers there are, and each worker holds the small proof for its own leaf.

## Verifying your own proof independently

You don't have to trust the coordinator's say-so. The guide describes a proof checker that does three things, in order:

1. Re-derives your leaf hash from the fields in your proof bundle, using a port of the contract's own leaf function.
2. Rebuilds the root your proof implies, using a port of the contract's Merkle check.
3. If you give it a chain RPC address and the settlement contract address, reads the root the contract actually has for that epoch and compares. The guide calls this "the check that matters", because a bundle can be perfectly self-consistent and still be a lie if that root was never committed.

The guide's shape for the inputs is a proof bundle fetched with your account key, plus the contract address and an RPC URL:

```bash
curl -H "Authorization: Bearer $DICO_KEY" \
  "https://<coordinator>/v1/payouts/proofs?epoch=<epoch>" > my-proof.json
```

and it reports `verified` only when the leaf rebuilds the committed root. The guide says altering the amount, the address, a sibling hash or the root is rejected, as is a genuine proof checked against the wrong deployment. Note that these tools live in the project's settlement code, and the page's commands run from a source checkout. We did not run them for this post.

A proof check answers "is this leaf in the tree", not "is the amount honest". The guide covers that second question too. A reconciliation tool re-runs the coordinator's own aggregation against the receipts you hold and compares the result with your claim bundle before you sign. It tells you which step, such as the floor or a carry-over, produced any difference.

## Checking epoch state on /verify

The [/verify](/verify) page is the quickest public look. It reads directly from the deployed `EpochSettlement` contract on XDC, "not a DiCompute-hosted record", needs no account, and lets you look up an epoch and optionally a worker. The same page has a section to compare published agent binary hashes with a running agent's version and hash.

Use it to see whether an epoch has a committed root. An empty or missing result is what you'd expect from a network whose fleet path is this quiet.

## Status: testnet, and a claim is a record

To pull the guide's cautions together:

- **Network.** Contracts are on XDC Apothem, chain 51, deployed on 2026-08-30. There is no mainnet deployment.
- **Funding.** Nothing funds the claimed balance, and the treasury question is open and waiting on a human decision. Don't treat a claim as money.
- **How far it has run.** The guide says the full claim flow has only been exercised end to end against a local test node in the project's own test suite, not yet against the live Apothem deployment.
- **Who can claim.** Claims are permissionless: anyone can submit yours, but the leaf names your registered wallet, so they can't redirect it. On-chain claims are public events.
- **Privacy.** Your worker id is permanently linked to your registered payout wallet by the platform, and a wallet address on a public chain can be correlated by anyone. The guide calls this "linkable".
- **Alternative rail.** A second, fiat-style rail exists but is off by default, and the two rails are mutually exclusive. Withdrawals are not open on dicompute.ai.

## Next steps

- [Claiming your earnings](/docs/provider/claiming-earnings): the full guide, including proof checks and refusal messages.
- [/verify](/verify): look up an epoch on the deployed contract.
- [Provider quickstart](/docs/provider/quickstart): registering a payout wallet.
- [Running a DiCompute provider node](/blog/running-a-dicompute-provider-node): the overview, and what isn't live yet.
