---
title: "Leaving SQLite, one store at a time"
description: "Why every durable store is moving from bun:sqlite to Postgres, in what order, and what had to be proven before the money path was allowed to go last."
date: 2026-09-02
authors: [DiCompute team]
tags: [postgres, ledger, architecture]
categories: [engineering]
cover: /blog-assets/blog/leaving-sqlite-one-store-at-a-time/banner.webp
---

For most of its life this system ran on `bun:sqlite`. The engineering doctrine
said so in as many words — rule 5, "no native addons", carried the corollary
*"`bun:sqlite`, not Postgres, at this scale"* — and the journal's do-not-redo
list refused Postgres twice: once for the key store, once for "anything money-
or key-adjacent". On 29 August 2026 the owner reversed that, and decision
[record 0060](/decisions/0060) writes down why, what is in scope,
and what would reverse it again. This post is that record in prose.

## What changed

Three facts moved between the original refusal and the decision.

**Postgres no longer implies a native dependency.** `Bun.SQL` ships inside the
pinned Bun 1.4.0 runtime. There are zero `bun.lock` entries for it and nothing
for the native-dependency gate to scan. Rule 5's stated basis for its
corollary no longer holds as written.

**Postgres can hold the ledger's invariants — and prove one that SQLite cannot
express.** The viability spike passes 10 of 10 checks against Postgres 17,
including the one that matters most for a billing ledger: twenty concurrent
reserves against one balance admit exactly three, with no oversell. Under the
SQLite design that property is inherited from an OS-level file lock and never
tested; under `SELECT … FOR UPDATE` it is a proven, per-account-row property.

**The seam exists and its cost has been measured.** Decision record [0052](/decisions/0052)
shipped a per-store interface and factory. The first store to go async behind
it, `invite-codes`, kept SQLite underneath and measured what the refactor
costs: 13 source awaits, 86 test awaits, one real shutdown decision. The
migration's shape stopped being an estimate.

## The order

Every store moves, not a subset — a permanent split between two database
technologies is exactly the state the journal warned about, so the split is
made transitional and bounded by an explicit order:

1. **Rehearsal** — `invite-codes`, the store the pilot already async-ified.
2. **Read-mostly bulk** — `request-log`, `route-outcomes`, `metrics-history`,
   `health-history`.
3. **Identity and access** — `keys`, `email-identities`, `wallet-identities`,
   `admin-credentials`, `oauth`, `scim-tokens`.
4. **Money, last** — `ledger`, `signup-grants`, the `billing-*` stores,
   `payout-accounts`, `pricing`, fee overrides.
5. **Fleet** — the 15 stores under the gateway's own home directory, their
   own tree.

Each store follows the same three steps: async-ify it with SQLite still
underneath (verified by the existing suite, unchanged), then add a Postgres
backend selected by the factory (verified by the same contract suite plus the
concurrency tests only Postgres can express), then cut production over by
configuration with SQLite retained. A failure at each step has exactly one
possible cause.

It is deliberately **not** a dual-write design. A store switches reads and
writes together by changing one environment variable from a file path to a
`postgres://` URL, inside a stop/start window. The rollback is to set the
variable back.

## What the money path needed first

The ledger is what [billing](/docs/billing) describes: a request reserves
funds, is served, then settles for what it actually cost. Two things had to be
designed before that path was allowed anywhere near a network database.

**Concurrency.** Decision record [0062](/decisions/0062) fixes the model: row-level locking via
`SELECT … FOR UPDATE`, one lock per account, with the idempotency check made
`ON CONFLICT`-safe. Not `SERIALIZABLE` — a transaction that already takes the
exact lock it needs has nothing to retry, and a retry contract would land on
every caller. The exclusive file lock the SQLite ledger relies on is made
unnecessary rather than replaced. That record is an additive proof with real
code and real tests, not a production cutover; the cutover is its own tracked
piece of work.

**Test isolation.** Decision record [0053](/decisions/0053) keeps SQLite `":memory:"` as the
default for every store's tests, so a plain checkout still needs no server,
and gives the Postgres tier a fresh `CREATE DATABASE` per test. CI runs a
`postgres:16` service container so those proofs never silently skip. The
record also re-measured the issue that prompted it: 404 test files and 2,119
occurrences reference `":memory:"`, not the 514 and 2,527 the issue claimed —
and says so prominently rather than working around it.

**Migrations.** The Postgres migration ladder keeps the SQLite one's contract
— contiguous steps, one transaction per step, refuse a newer-binary schema —
and adds the property a shared database needs: every step runs under a
transaction-scoped advisory lock, so several instances booting at once apply
it exactly once.

## Why write this down

Because the doctrine said no, and the reasons it said no were good ones at the
time. A reversal that is not written down looks like drift. This one has a
date, an owner, a scope and a stop signal — if the money tier ever needs its
invariants relaxed to fit, that is the signal to stop, not to relax them.

Partner-visible changes land in the [changelog](/changelog) as each store
cuts over.
