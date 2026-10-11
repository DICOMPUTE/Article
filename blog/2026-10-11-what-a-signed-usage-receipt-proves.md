---
title: "What a signed usage receipt proves, and what it doesn't"
description: "Every request a worker serves produces a receipt it signs and the coordinator countersigns. Here's what that proves, and why earnings depend on it."
date: 2026-10-11
authors: [DiCompute team]
tags: [providers, receipts, verification]
categories: [providers]
cover: /blog-assets/blog/what-a-signed-usage-receipt-proves/banner.webp
coverAlt: "Duotone editorial illustration: a tilted orbit ring around a solid point, with a second point travelling the ring, picked out in accent; a cyan accent on a deep ink field."
---

Verifiable inference and cryptographic proofs of compute were a major theme in
2026's decentralized AI discussions. DiCompute's version is modest and
concrete: a signed usage receipt for each request a fleet worker serves. This
post says exactly what a receipt contains, who signs it, and, just as
important, what it cannot show.

Two status notes first. **Receipts are issued only for fleet-served requests.**
Most traffic today goes direct to the engine and produces no receipt at all,
including console chat, which shows "First-party turn". And the fleet carries
real traffic for one internal test account only. Receipts are also not
payments: serving does not credit providers by default yet, and withdrawals are
not open.

## The trust problem in paying strangers for compute

If you let strangers run your users' requests and plan to pay them for it, you
need a record of what each one did. A worker's own claim is not enough, because
the worker is the party being paid. A consumer's claim is not enough either.
The receipt is the design's answer: a record signed by the worker, countersigned
by the coordinator, and kept so that anyone can later re-check it.

## Anatomy of a receipt

According to the [provider security model](/docs/provider/security-model), for
each request the agent serves it builds and signs a usage receipt containing:

- the `requestId` and the worker's `workerId`
- the model
- the token counts your engine reported, never estimated
- a price quote and a timestamp

It is signed with the worker's secp256k1 identity key. The agent's identity
therefore matters: anyone holding `identity.json` can sign receipts as you.
When the worker binds content, the receipt also carries `requestHash` and
`responseHash`, which tie it to the bytes that were sent and received.

## The countersignature and the journal

The coordinator verifies the worker's signature and adds its own
countersignature before relaying the receipt onward. It then records the
receipt in its journal. The [verification docs](/docs/verification) describe the
result for a consumer as a `dico_receipt` object: both signatures, both public
keys, the receipt, and a content-binding verdict of match, mismatch or absent
for each side. The platform bills against this same receipt.

## How a consumer checks one

A fleet-served response carries its receipt: a top-level field on non-streaming
chat responses, and a trailing frame on streams. The docs give a recipe: fetch
the worker's public attestation and confirm its signing key equals the key in
the receipt, canonicalize the receipt, hash it with keccak256, and check both
signatures. That cross-check against the worker's attestation is the step that
stops you verifying a signature against a key the response itself supplied.

Or you can ask the platform to do it. `POST /openai/v1/receipts/verify` is
public, and rejects a body that is not a real receipt. We ran it with an empty
object:

```bash
curl -sS -X POST https://dicompute.ai/openai/v1/receipts/verify \
  -H 'content-type: application/json' -d '{}'
```

```json
{"error":{"message":"request body is not a valid receipt verification request","type":"invalid_request_error","param":null,"code":"invalid_request"}}
```

That is a `400`, which shows the route is live and validates its input. It is
not a verification result, because we have no fleet receipt to submit. The
public `GET https://dicompute.ai/v1/attestation` route lists each worker's
trust state, limited to fields the coordinator checked cryptographically.

## What a receipt doesn't prove

The [verification docs](/docs/verification) list the limits plainly, and they
are worth reading in full. The main ones:

- **It proves a claim was signed, not that the output was correct.** The
  receipt shows which worker served a request, what it claims it sent and
  received, and that the coordinator countersigned that claim. It does not show
  that the model produced a good answer, or that the token counts are the true
  work done. Those counts come from the worker's engine.
- **The coordinator key has no independent source of truth.** Both signatures
  check out as internally consistent. That alone does not prove the coordinator
  key is genuinely DiCompute's and not one fabricated next to a fake receipt.
  There is also no published rotation procedure for a verifier to plan around.
- **`request_id` is unsigned**, so a genuine proof can be pasted next to a
  different response and still pass the signature checks.
- **A valid proof does not expire.** There is no freshness window or
  seen-before check.
- **The prompt rendering is not committed.** Which exact prompt the model was
  shown is not something a consumer can check end to end yet.

None of this makes receipts useless. It marks the boundary: a receipt is
tamper-evident bookkeeping, and not a proof of computation.

## Why settlement re-verifies every receipt

The [claiming-earnings guide](/docs/provider/claiming-earnings) describes how
receipts are meant to feed settlement. When an epoch closes, the coordinator
re-verifies every receipt in the window cryptographically, adds them up per
worker with a dust floor and an audit manifest, and commits a Merkle root
on-chain. You fetch your proof, check it and sign a claim. Because the same
signed artifact is rechecked at each step, a tampered receipt fails early.
The re-verification is what makes the settlement arithmetic auditable instead of a
dashboard total you take on trust.

Do not read that as a payment pipeline running today. The contracts are on the
XDC Apothem testnet only, the guide calls an on-chain claim "a record, not a
payment", and crediting and withdrawals are off. Receipts are live for
fleet-served requests. Turning them into money is not.

## Next steps

- [Verifying what was served](/docs/verification): the full recipe and the
  list of limits.
- [Claiming your earnings](/docs/provider/claiming-earnings): the settlement
  design, and what is still missing.
- [Running a DiCompute provider node](/blog/running-a-dicompute-provider-node):
  the provider side from install to settlement.
