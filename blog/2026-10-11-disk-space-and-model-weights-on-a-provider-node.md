---
title: "Disk space and model weights on a provider node"
description: "Where dico-agent keeps weights, logs and state, how to clean up safely, and how to plan capacity so a full disk never takes your node down."
date: 2026-10-11
authors: [DiCompute team]
tags: [providers, storage, operations]
categories: [providers]
cover: /blog-assets/blog/disk-space-and-model-weights-on-a-provider-node/banner.webp
coverAlt: "Duotone editorial illustration: a tilted orbit ring around a solid point, with a second point travelling the ring, picked out in accent; a cyan accent on a deep ink field."
---

Ever-larger open model weights made storage planning a top home-lab pain point
in 2026. On a provider node, disk is the one resource that fails without
anyone noticing. This post is a map of where `dico-agent` puts things, which
commands reclaim space, and what you must never delete. Everything here comes
from the [provider storage docs](/docs/provider/storage), and the docs say that
if the page and the code ever disagree, the code is right.

Status, in one line: connecting a node gets you a linked worker, not traffic.
The fleet path carries real traffic for one internal test account only, so a
fresh node sits at zero requests ([operate page](/operate)). Disk planning is
about keeping the node healthy, not about expecting load.

For install and join, see
[Running a DiCompute provider node](/blog/running-a-dicompute-provider-node).

## Why disk is the silent failure

Weights are by far the largest thing a node holds. The storage page's capacity
formula notes that a model's weights run "a few GB to 100+ GB", and that
everything else on the page is "rounding error next to it". A full disk
rarely announces itself. A download stalls, an update cannot stage, and
`doctor` starts reporting thresholds. Knowing the layout up front is cheaper than
finding out by an outage.

## The directory map under DICO_AGENT_HOME

`DICO_AGENT_HOME` is `~/.dico/agent` on Linux and macOS (and
`%LOCALAPPDATA%\dico\agent` on Windows) unless you set the variable. It holds:

| File or folder | What it is |
|---|---|
| `identity.json` | Your worker's keypair, mode 0600 |
| `state.json` | Live snapshot for `dico-agent status`; small, rewritten in place |
| `agent.log` and rotated `agent.log.<epochMs>` segments | The agent's log; rotates at 5 MiB |
| `crash-history.json` | The last 50 launch records |
| `log-upload-cursor.json` | A few bytes tracking what a previous log upload sent |
| `kv/` | An at-rest cache that is dormant today; on a fresh install the folder does not even exist |

Two locations are deliberately **outside** that folder:

- **Model weights** live under `MODEL_WEIGHT_ROOT/<modelId>/`, one subdirectory
  per model. This is the large one.
- **Update staging files** sit next to the running binary, not in the agent
  home: a `.next` file for the binary being verified, a `.prev` file that is the
  rollback target, and a `.failed` file for a failed download kept for
  inspection. Each is roughly one binary's worth, which the docs put at tens of
  megabytes.

If you use `dico-agent install-service`, it bakes the paths in effect at install
time into the service unit. If you later move a directory, re-run
`install-service`, or the supervised process keeps using the old location.
`doctor`'s service-environment check reports that drift.

## Model weights and multiple versions

Each model's manifest files are written under its own directory. While a file
downloads, it exists as a `.part` file plus a small `.part.meta.json` sidecar
that records which hash the partial belongs to and how many resume attempts
failed. A single `.complete` marker at the model's root is written once every
file is downloaded and checked, and that marker, not the folder's presence,
decides whether the model counts as downloaded. A folder with files but no
marker is a partial download.

If you serve several models, multiply: the docs' budget formula is weights per
model, times the number of models served concurrently, plus headroom if you set
a disk budget. There is also an optional Hugging Face cache link
(`MODEL_HF_CACHE_ENABLED=1`) that creates symlinks so other tools find the same
bytes without a second copy. It costs no extra disk.

## Logs: rotation and purge

The agent log rotates when it reaches its size limit. Rotated segments are
removed by:

```bash
dico-agent logs purge
```

which clears rotated `agent.log.*` segments past the retention policy and never
touches the live `agent.log`. The `--all` variant widens it; see the
[CLI reference](/docs/provider/cli-reference) for the exact flags.

## Safe cleanup versus files never to delete (identity.json)

Safe, per the docs:

| Command | Reclaims | Leaves alone |
|---|---|---|
| `dico-agent remove-model <id>` | One model's whole weight directory | Other models; refuses if that model is currently serving |
| `dico-agent remove-model --orphaned` | Orphaned model data | Models in use |
| `dico-agent logs purge` | Old rotated log segments | The live log |
| Disk-budget sweep (`MODEL_DISK_BUDGET_BYTES`) | Whole model directories, oldest-used first, when usage passes the budget | Models that are serving, loading, mid-download or resumable. Default is `0`, which disables it |

Some cleanup the agent does itself: before a download it sweeps `.part` files
whose target no longer appears in the manifest, but it leaves partials for
files the manifest still names, because those are live resume state.

One gap to know about: a `.next` or `.failed` staging file left behind by an
interrupted update is not reclaimed by any of the above. It sits next to the
binary until the next successful update overwrites it. Doctor warns about
leftover `.dico-agent.staged.<pid>` files too, each a full copy of the binary
(about 90 MiB, per the docs). Delete those by hand or re-run the installer,
which sweeps them.

**Never delete `identity.json`.** It holds your worker's private keys. If you
regenerate it, the coordinator, which pinned your worker id to the key it saw
first, will close your connection with a key-mismatch and you cannot fix that
yourself. The `identity.json.corrupt-*` quarantine copies hold the same key
material, so treat them the same way. Also keep the credentials file in step
with it. See the [security model](/docs/provider/security-model) before you
touch any of it.

## Capacity planning before adding a model

Start from what is actually on disk:

```bash
dico-agent storage            # weights per model, bytes in .part files, KV cache, staging, log, free space
dico-agent storage --json
dico-agent data               # every path the agent has written, for privacy review
```

Then check the model's manifest for its size before you add it. Don't guess:
the docs give a range, not a number per model. Budget as the docs do:

1. Weights for each model you will serve, times the number of models served
   concurrently.
2. Headroom up to your disk budget, if you set one. Lowering the budget does not
   shrink existing weights at once.
3. One update staging slot, tens of megabytes.
4. A few megabytes for state, log, crash history and the upload cursor.

Two thresholds are worth remembering. The model weight disk check only applies
when `MODEL_WEIGHT_ROOT` is set, and per the
[troubleshooting docs](/docs/provider/troubleshooting) it fails under 1 GiB free
and warns under 20 GiB free. If you have not set `MODEL_DISK_BUDGET_BYTES`,
weight usage grows without bound as you add models, so `dico-agent storage`
is how you notice before the disk does.

## Next steps

- Read the [provider storage docs](/docs/provider/storage) for every variable.
- Keep the [troubleshooting docs](/docs/provider/troubleshooting) at hand for the
  disk and readiness checks.
- Read the [security model](/docs/provider/security-model) before you move or
  delete anything under the agent home.
- Return to [Running a DiCompute provider node](/blog/running-a-dicompute-provider-node).
