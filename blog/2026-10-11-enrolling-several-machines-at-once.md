---
title: "Enrolling several machines at once"
description: "Use provision-fleet.sh to bring a rack or a closet of boxes into DiCompute over SSH, with one inventory file and the same verified installer."
date: 2026-10-11
authors: [DiCompute team]
tags: [providers, fleet, operations]
categories: [providers]
cover: /blog-assets/blog/enrolling-several-machines-at-once/banner.webp
coverAlt: "Duotone editorial illustration: a tilted orbit ring around a solid point, with a second point travelling the ring, picked out in accent; a cyan accent on a deep ink field."
---

Small independent GPU farms and university labs looked for ways to join
compute networks at scale in 2026. If you have ten machines, running the
installer by hand ten times is tedious and easy to get wrong. DiCompute's
[bring-up docs](/docs/provider/fleet-bring-up) describe a script for exactly
that: `provision-fleet.sh`, which enrolls boxes over SSH.

A candid status line before the how-to. Enrolling a box gets you a linked,
connected worker. It does not get you traffic. The fleet path carries real
traffic for one internal test account only, so every box you enroll will sit at
zero requests for now ([operate page](/operate)). Nothing here is a way to
earn anything today, and a bigger fleet does not change that. This post is about
the mechanics of getting many machines enrolled safely.

The script lives in DiCompute's source repository, so you run it from a
checkout of that repository on a machine that has SSH access to the boxes.
That repository is private today (the
[provider quickstart](/docs/provider/quickstart) says the same when it
describes fetching the installer from git), so running the script as written
needs read access to it. What the script drives is public, though: the
per-host step below is the published installer plus an enrollment token. If you
have not
enrolled a single box yet, do that first with the
[provider quickstart](/docs/provider/quickstart) and the overview in
[Running a DiCompute provider node](/blog/running-a-dicompute-provider-node).

## When one-at-a-time stops scaling

Enrolling one box is a single command that picks a model, downloads weights,
and links the machine to your account. Repeating that by hand across a rack
means repeating a browser-based sign-in per machine, plus remembering which
boxes you already finished. The bring-up script removes the repetition without
inventing a second way to install: it drives the same installer you would run
by hand.

## provision-fleet.sh versus update-fleet.sh

The two scripts are siblings and share the same inventory file:

| Script | For | Boxes it touches |
|---|---|---|
| `provision-fleet.sh` | Bring-up: first-time enrollment | Boxes that have never joined |
| `update-fleet.sh` | Re-pushing a release (documented for DiCompute's own operations) | Boxes that have already joined |

Both drive the same underlying installer. The docs chose a plain shell script
over Ansible or Terraform on purpose, and say why: Ansible would add a
toolchain this project does not otherwise use, and Terraform provisions cloud
resources, while these are boxes you already own and can reach over SSH. The
docs also say plainly what the script is not: it is a one-shot bring-up, not
continuous configuration management. If you need to keep a fleet's config
reconciled over time, a real config-management tool is the right reach.

## The inventory file

The repository ships example files. You copy the inventory example to
`deploy/provider-fleet/inventory.txt`, list your hosts, and run the script
against a named environment:

```bash
cp deploy/provider-fleet/inventory.example.txt deploy/provider-fleet/inventory.txt
scripts/provision-fleet.sh --env staging --secrets /path/outside/any/repo/secrets.txt
```

Use `--dry-run` first. It prints exactly what would run on each host, with the
token position marked as redacted, and opens no SSH connection. `--hosts h1,h2`
limits a run to a subset, which is handy for retrying only the hosts that
failed. `--model <id>` and `--skip-service` pass through to the same variables
the installer already documents. The `--env prod` setting additionally requires
`--force-prod`, the same gate the update script uses. See the script's `--help`
for the full list.

## What runs on each host over SSH

For every host, the script runs the same non-interactive install that the docs
describe for one box: the installer script, fetched over `curl` and piped to
`sh`, with an enrollment token and a node name in the environment. That default
path installs the binary, runs `dico-agent join`, then runs
`dico-agent install-service` so the box comes up as a supervised service that
restarts after a crash. The script itself reimplements none of that. Its only
extra jobs are fanning the command out to N hosts, and handing each host its own
token without leaking it.

The installer keeps the checks you would get on a single box: the binary is
checked against its published checksum and signed manifest. See
[verified builds](/verified-builds) for the commands behind that.

One bad host does not stop the rest. A failure is recorded, the run continues,
and the overall exit code still reflects it. Re-running against hosts that
already succeeded is safe: `join` only does its login step when no credentials
exist yet, and `install-service` always writes the same fixed unit path, so you
do not end up with duplicate workers or duplicate units.

## How approval works when you enroll many boxes, per the doc

A normal `join` asks you to approve each machine in a browser. That does not
scale, so the script uses **enrollment tokens** instead. Per the doc:

- You mint one token per host, with an authenticated request to the
  coordinator's enrollment-token route, as yourself. It binds to your account,
  the same identity a device-code approval would use.
- A token is **single-use** and **short-lived**: it is valid for a short default
  window, so mint tokens close to when you run the script rather than hours
  ahead.
- There is a cap on pending tokens per account, so a fleet larger than one
  batch needs more than one minting round.
- Tokens live in coordinator memory only. A coordinator restart between mint
  and use invalidates every unused token, and affected hosts get a not-found
  answer, the same as an expired one. If several hosts fail at once, suspect a
  restart and mint again.
- A leaked token lets its holder create credentials for exactly one worker on
  your account, within that window, and nothing else. That is much smaller
  than a leaked credential, but handle the token file like any short-lived
  secret.

You give the script the tokens in a local file with one `<ssh-alias> <token>`
pair per line. The script has no default path for it, on purpose. It refuses
the whole run, touching no host, if git already tracks that file, and it warns
if the file is readable by others. The token travels to each host over the SSH
session's standard input, not on any command line, so it does not show up in
process listings on either machine, in the results table, or in the script's
journal.

One practical limit: the coordinator's unauthenticated onboarding routes are
rate-limited per source address, and every box behind one shared outbound
address shares that budget. The doc's advice is to pace the batch in waves.
Using enrollment tokens already keeps each host to a single exchange call.

## Keeping the fleet updated afterwards

Once the boxes are joined, `provision-fleet.sh` is done. To move them to a new
release, each agent updates itself with `dico-agent update`. The sibling
`update-fleet.sh` shares your inventory, but the docs describe it for
DiCompute's own operations, so check that page before relying on it for yours.
The mechanics, including holds, quarantine and rollback, are in the
[upgrading docs](/docs/provider/upgrading).

## Next steps

- Read the [fleet bring-up docs](/docs/provider/fleet-bring-up) before your
  first run, and do a `--dry-run`.
- Enroll one box by hand with the [provider quickstart](/docs/provider/quickstart)
  so you know what a good result looks like.
- Learn the update path in [Upgrading and rolling back](/docs/provider/upgrading).
- Read the whole provider story in
  [Running a DiCompute provider node](/blog/running-a-dicompute-provider-node).
