---
title: "Installing dico-agent on an air-gapped network"
description: "No egress? Bundle the binary, the engine and the model weights, and keep every checksum and signature check an online install has."
date: 2026-10-11
authors: [DiCompute team]
tags: [providers, air-gapped, security]
categories: [providers]
cover: /blog-assets/blog/installing-dico-agent-on-an-air-gapped-network/banner.webp
coverAlt: "Duotone editorial illustration: a tilted orbit ring around a solid point, with a second point travelling the ring, picked out in accent; a cyan accent on a deep ink field."
---

Security-conscious organizations running isolated GPU clusters for AI grew
sharply in 2026. A datacenter VLAN with no egress, or a research network behind
a strict allowlist, is a common home for GPUs, and a normal `curl | sh` install
fails there partway through. The [air-gapped install docs](/docs/provider/air-gapped-install)
describe a procedure that works around it. This post walks through it.

The status line comes first, because it matters here more than anywhere. An
air-gapped box can be **installed** offline, but it cannot **serve the network**
offline. To link to your account and to serve, the agent must reach the
coordinator: the docs say so, and `dico-agent start` holds an authenticated
WebSocket open to it. Offline install is a way to cut the large downloads, not
a way to run fully disconnected. As for traffic, the fleet path carries real
traffic for one internal test account only, so a newly linked worker sits at
zero requests ([operate page](/operate)).

For the ordinary online flow, read
[Running a DiCompute provider node](/blog/running-a-dicompute-provider-node).

## The three network dependencies of a normal install

An ordinary install fetches three large things from three places:

1. **The agent binary**, from the release URL, by the installer script.
2. **The inference engine.** If no engine is running, the agent installs a
   pinned llama.cpp release, fetched from GitHub.
3. **The model weights**, from the coordinator.

Behind a firewall with no egress, each of these fails with its own `curl`
error, which is a poor way to learn that the network is the problem. The bundle
procedure replaces all three with local disk.

## Building a bundle on a connected machine

You build the bundle on a machine that does have network access, using the
repository's `make-offline-bundle.sh` script. It needs a checkout of
DiCompute's source repository with Bun, `curl` and `git`. That repository is
private today, so building a bundle this way needs read access to it; the same
goes for the mirror checker further down.

```bash
bun install
scripts/make-offline-bundle.sh \
  --version <exact-published-version> \
  --target linux-x64 \
  --model <model-id> \
  --out /path/to/bundle
```

Notes from the docs:

- `--version` is required and must be an exact, already-published release.
  The agent's current version is in the release feed
  (`/releases/agent/latest.json`); the docs pin no version number.
- `--target` takes the same target names the installer reports, for example
  `linux-x64`, `linux-arm64`, `macos-arm64` or `windows-x64`.
- `--model` is optional. Leave it out to bundle just the binary and engine, and
  add weights later.
- `--backend cpu|rocm|vulkan` picks which llama.cpp build to include. CPU
  always exists.
- The script refuses, and writes no partial bundle, on any mismatch.

The result is a directory holding the binary and its checksum, the signed
release manifest and signature, the engine archive, one folder per model with
the coordinator's own weights manifest, and a `bundle-manifest` pair listing the
size and hash of every file.

## The binary, the engine and the weights, each verified

Nothing about trust changes. Every fetch the bundle script makes is verified
the way an online install verifies it, and the bundle then carries the same
evidence forward: the binary's checksum, the signed release manifest and its
signature, and the weights manifest that names each weight file's hash. You can
read the checks the installer performs on the
[verified builds](/verified-builds) page.

The extra `bundle-manifest` files have a narrower purpose. They are not part of
the real trust chain. They exist to catch a USB stick or file share that
truncated or corrupted something in transit, checked once before the real
verification starts. A bundle that passes this check but fails a real one, such
as a stale binary or a bad signature, is still refused.

You can check it by hand with no DiCompute tooling:

```bash
cd /path/to/bundle && sha256sum -c bundle-manifest.sha256
```

## Installing from local disk

Copy the directory across the gap however your policy allows. On the isolated
box, point the installer at it:

```bash
DICO_VERSION=<exact-published-version> DICO_BUNDLE_DIR=/path/to/bundle sh scripts/install-agent.sh
```

`scripts/install-agent.sh` is the installer as it sits in the repository. The
published installer at `https://dicompute.ai/releases/agent/install.sh` also
reads `DICO_BUNDLE_DIR`, so you can carry that file across with the bundle
instead.

`DICO_VERSION` must be set explicitly. Resolving "latest" would need the very
network call this mode avoids, so the installer refuses up front. It verifies
the bundle manifest first, then runs the same checksum and signature chain as
the online path, reading every file from the bundle instead of fetching it.

Each stage also has its own `--bundle <dir>` flag if you want to run them
separately. First the binary only, with no join:

```bash
DICO_VERSION=<exact-published-version> DICO_SKIP_LOGIN=1 DICO_BUNDLE_DIR=/path/to/bundle sh scripts/install-agent.sh
```

Then the engine, once the binary is installed:

```bash
dico-agent update-engine --bundle /path/to/bundle
```

Then the weights for one model:

```bash
MODEL_WEIGHT_ROOT=~/.dico/weights MODEL_ID=<model-id> \
  dico-agent download-model --bundle /path/to/bundle
```

These commands install from the bundle only. They do not contact the network
for the large files.

## What still needs connectivity to serve

Two small calls remain, plus serving itself:

- **The model catalog.** `dico-agent join` fetches the catalog from the
  coordinator to validate a model id or auto-pick one. The docs describe it as a
  few kilobytes, not gigabytes.
- **The device-code login**, or an enrollment token. The box must still reach
  the coordinator to link to your account. An enrollment token means that step
  needs no browser on the box itself.
- **Serving.** Once linked, the agent keeps a live connection to the
  coordinator. If your box cannot reach it at all, install and prepare it with
  this procedure, then move it to a network segment that can reach the
  coordinator.

Not covered: the vLLM engine. Its dependency set is a different and larger
problem than one pinned archive, and the docs mark it out of scope for the bundle
format. llama.cpp, the default engine, is fully covered.

## Keeping a mirror current

If your network is isolated but not fully cut, or you just have little
bandwidth, the [mirroring docs](/docs/provider/mirroring) describe an
alternative: an rsync'd copy of the release feed that installers can point to
through `DICO_RELEASE_URL`. A few rules from that page:

- The release URL is a base, not a browsable directory.
- `latest.json` changes on every publish and must not be served with a long
  cache lifetime, or fresh installs pin an old version.
- A published version directory is immutable, so sync it once. A deactivated
  version keeps its files, but its small `release.json` changes, so re-sync that.
- Run `bun scripts/check-mirror-consistency.ts <mirror-root>` after every sync.
  It checks that the files are present and consistent, and fails loudly on a
  partial copy.

Mirroring a **signed** release is safe whoever hosts it, because the signature
over the manifest is what an installer trusts. A mirror of an unsigned release
is only as trustworthy as whoever runs it, so don't point production at one
unless you already trust that operator.

## Next steps

- Read the [air-gapped install docs](/docs/provider/air-gapped-install) end to
  end before you build a bundle.
- Read the [mirroring docs](/docs/provider/mirroring) if you want a standing
  copy of the release feed.
- Check the build and checksum details at [verified builds](/verified-builds).
- Start with [Running a DiCompute provider node](/blog/running-a-dicompute-provider-node)
  if the provider side is new to you.
