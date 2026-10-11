---
title: "How dico-agent upgrades and rolls back"
description: "Self-update without downtime surprises: the check-swap lifecycle, holding updates, quarantined versions, and rolling back a bad release."
date: 2026-10-11
authors: [DiCompute team]
tags: [providers, operations, upgrades]
categories: [providers]
cover: /blog-assets/blog/how-dico-agent-upgrades-and-rolls-back/banner.webp
coverAlt: "Duotone editorial illustration: a tilted orbit ring around a solid point, with a second point travelling the ring, picked out in accent; a cyan accent on a deep ink field."
---

Safe auto-update for edge and home-lab software became a reliability priority
after notable 2025 and 2026 update outages. If your `dico-agent` runs on a box
nobody watches, the way it updates is part of your uptime story. This post
walks through what actually happens on the box during an update, as described
in the [upgrading docs](/docs/provider/upgrading).

Two honest notes up front. First, updates are **manual by default**: nothing
fetches a new release unless you run `dico-agent update` or opt in to the
periodic check. Second, the docs describe a design with guardrails, not a
guarantee. No part of this promises that an update will never interrupt
anything, so plan the way you would for any software you restart. And as with
every provider topic today, a freshly joined worker sitting at zero requests is
normal ([operate page](/operate)); that has nothing to do with updates.

For the install and join flow that comes first, see
[Running a DiCompute provider node](/blog/running-a-dicompute-provider-node).

## Why self-updating agents need guardrails

An agent that replaces its own binary has a hard problem: the code doing the
replacing is the code being replaced. If the new binary does not start, nobody
is left to put the old one back. If power fails halfway through a write, you
can be left with a half-written file. The design below exists to remove both
failure modes, and to make a bad release cost you one stalled version instead of
an unattended box that stays down.

## Check then swap: two separate processes

The docs describe an upgrade as two processes, on purpose. The agent that is
already serving never performs its own swap. In order:

1. **Check.** A running agent reads the release manifest on its own schedule.
   `dico-agent update` (or `--check-only`) does the same check by hand. If
   updates are held, or this exact version is already quarantined, it stops
   here and writes nothing to disk.
2. **Stage.** The new binary is downloaded, checked against its checksum and
   signature with the same embedded release-signing key the installer trusts,
   and written *next to* the live binary. A smoke test then runs the staged
   binary. If that fails, the version is quarantined and nothing is committed.
3. **Drain.** In-flight requests get a bounded window to finish, and the agent
   stops accepting new ones. Nothing before this step has interrupted a request.
4. **Swap.** A separate watchdog process, `dico-agent apply-update`, takes over.
   It waits for the old process to exit and then performs an atomic rename that
   lands on one of two states: old binary fully live, or new binary fully live.
   The docs say this holds even across a power loss.
5. **Health gate.** The watchdog starts the new binary and polls it for a
   bounded window. If it passes, a healthy record is written.
6. **Rollback.** If the gate fails, or the running agent detects a crash loop,
   the previous binary comes back automatically.

Every phase is journaled before it runs, so a killed watchdog or a power cut
leaves the next start able to tell where it stopped.

The journal is a single file next to the binary: one overwritten record of the
latest attempt, not a running log. Read it with:

```bash
dico-agent update history
dico-agent doctor --offline
```

The phase names you may see are `staged`, `prev-saved`, `committed`, `healthy`,
`rolled-back` and `quarantined`.

## Holding updates with update --hold

The check step above mentions held updates. A hold stops the tick before it
writes anything. It is the tool for "do not touch this box until I say so", for
example a node you want frozen through a busy week. The
[CLI reference](/docs/provider/cli-reference) lists the exact flags and exit
codes for `update` and its subcommands, and the upgrading page deliberately does
not repeat them. Check there for the current `--hold` syntax rather than relying
on a copy in a blog post.

The automatic check is opt-in. `dico-agent update --auto on` sets the check
interval and refuses to enable itself if the manifest URL is empty, so it
cannot be turned on in a state where it could never fire. `--auto off` returns
to manual, and `--auto status` reports where the box stands. A box with
autoupdate on goes through the same stage, drain, swap and health-gate path.

One more detail: running `dico-agent update` against a live agent signals it to
run one update tick now, even when autoupdate is off, then waits for the
outcome and exits with it. Zero means up to date or a confirmed update. Anything
else means held, refused, rolled back, or no answer in time.

## Quarantine: a version that failed

A version is quarantined when it fails the smoke test or the post-swap health
gate, and for no other reason. The effect is narrow: this agent stops retrying
that exact version until a newer manifest supersedes it. It is not a global
kill switch and does not affect other boxes.

You cannot clear a quarantine by editing a file, because there is none to edit.
Two things end it:

- A newer release supersedes the quarantined one.
- You ask for one more attempt of the same bytes with `--override-quarantine`.
  This fits failures that were environmental, such as a network blip during the
  smoke test, and not a real defect.

## Rolling back

Two paths restore the previous binary, and both use the same underlying step,
"put the verified predecessor back":

- **Automatic**, through the crash-loop watchdog. If a new version crashes
  repeatedly in a short window, it reverts with no action from you. It only
  reverts to a version this same mechanism previously installed, and a guard
  stops it from bouncing between two bad releases.
- **Manual**, with `dico-agent update --rollback`. This is for a release that
  runs badly without crashing, such as slower output or a capacity regression
  that the health gate did not catch. It needs no network, because it works from
  the install's own journal and its retained previous binary. It refuses if
  there is no verified predecessor, or if that exact version was already rolled
  back once.

A rollback does not restart the service for you. Follow it with
`dico-agent restart`, or re-run the binary yourself if the install is not
supervised.

Re-running the installer is a different tool. It is for provisioning a new box
or deliberately reinstalling over a damaged one. For moving an already-joined
box to a newer release, use `dico-agent update`.

## Planned downtime: a maintenance window is a calendar entry, not a drain

If you are about to take a box offline on purpose, the
[maintenance docs](/docs/provider/maintenance) draw a line that is easy to
miss. A maintenance window is a calendar entry. Creating one does not stop the
coordinator routing work to your worker, does not silence any alert, and does
not call drain for you. It exists so your dashboard and the coordinator's
records show that the downtime was planned.

To actually stop routing, call drain yourself before the window starts and
undrain when it ends. Cancelling a window does not touch your drain state
either. Two details worth knowing: only one active window is allowed per worker,
and the docs state that no maximum window length is enforced.

## Next steps

- Read [Upgrading and rolling back](/docs/provider/upgrading) for the full
  lifecycle.
- Keep [Maintenance windows](/docs/provider/maintenance) open before planned
  downtime.
- Look up exact flags in the [CLI reference](/docs/provider/cli-reference).
- Revisit the whole flow in
  [Running a DiCompute provider node](/blog/running-a-dicompute-provider-node).
