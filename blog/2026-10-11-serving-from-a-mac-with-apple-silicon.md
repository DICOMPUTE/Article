---
title: "Serving inference from a Mac with Apple Silicon"
description: "Unified memory makes Macs capable inference boxes. Installing dico-agent on macOS, the Gatekeeper warning, and recognised M-series capacity classes."
date: 2026-10-11
authors: [DiCompute team]
tags: [providers, macos, apple-silicon]
categories: [providers]
cover: /blog-assets/blog/serving-from-a-mac-with-apple-silicon/banner.webp
coverAlt: "Duotone editorial illustration: a tilted orbit ring around a solid point, with a second point travelling the ring, picked out in accent; a cyan accent on a deep ink field."
---

Mac minis and Mac Studios became a home-lab favorite for running local language models in 2025 and 2026. This post is a macOS-specific walkthrough for turning one into a DiCompute provider node: what the installer does, the Gatekeeper warning you may see, what `join` sets up, and how the [earnings page](/earn) treats M-series chips.

Before the details, the honest status. A Mac can install the agent, link to your account and connect today. But the fleet path carries real traffic for one internal test account only, so a new worker sitting at zero requests is normal. Serving does not pay anything yet, and the [earnings estimator](/earn) describes itself as "a projection, not a payout". Set up a Mac because you want to see how the provider side works, not to make money this month. The general picture is in [Running a DiCompute provider node](/blog/running-a-dicompute-provider-node).

## Why Apple Silicon is popular for local inference

A language model has to sit in memory next to the chip that runs it. On a typical desktop PC, a GPU has its own pool of video memory, so the model size you can run is limited by that pool. Apple Silicon uses unified memory: the CPU and GPU share one pool. A Mac with a lot of RAM can therefore hold a large model without a discrete card, in a quiet, low-power box.

DiCompute doesn't need you to understand that detail, though it matters for one thing: the agent decides what your machine can do from its memory. According to the [hardware requirements](/docs/provider/hardware-requirements) page, model fit is judged on available memory minus a reserve (2 GB by default), never on total RAM. On macOS the agent reads total memory with `sysctl -n hw.memsize` and available memory from `vm_stat`, and the docs call the second figure an approximation.

## Installing on macOS and the Gatekeeper warning

You need macOS 13 (Ventura) or newer. The docs say the prebuilt binaries link against system symbols that older releases lack, so the installer refuses on older versions instead of falling back to a source build.

The install command is the same one used on Linux, quoted from the [provider quickstart](/docs/provider/quickstart):

```bash
curl -fsSL https://dicompute.ai/releases/agent/install.sh | sh
```

It picks the right binary for your chip (`macos-arm64` for Apple Silicon, `macos-x64` for Intel), checks it against its published SHA-256 and a signed manifest, and installs to `~/.dico/bin`. The [download page](/download) lists each binary's checksum, and [verified builds](/verified-builds) has a check command per platform.

Now the warning. The macOS binaries are **not signed with an Apple Developer ID and have not been notarized**. If you download a binary with a browser, Gatekeeper can refuse it with a message that Apple could not verify it is free of malware. The [troubleshooting guide](/docs/provider/troubleshooting) explains this and gives a way past it, after you check the file yourself:

```bash
shasum -a 256 ./dico-agent-macos-arm64
xattr -d com.apple.quarantine ./dico-agent-macos-arm64
chmod +x ./dico-agent-macos-arm64
```

Compare the `shasum` output with the checksum on [/download](/download) before you run the other two lines. The quarantine attribute is what Gatekeeper reads, and removing it is a deliberate choice you make after checking the bytes. On macOS 15 and later, the docs say Finder's right-click override is gone, and the replacement is System Settings, then Privacy & Security, then "Open Anyway".

The docs also say the one-line `curl` installer isn't expected to trigger the dialog, because `curl` does not set the quarantine attribute the way a browser does. They add that this hasn't been confirmed on a real Mac, so if you do see the dialog, the docs ask you to report it.

## What join does on a Mac

The installer goes straight on to run `dico-agent join`. On a Mac it:

1. Picks a published model that fits your free memory, or the one you name with `--model` or `DICO_MODEL`. `join --fast` picks the smallest model that fits instead of the largest.
2. Downloads the weights and checks their hashes.
3. Looks for an inference engine. If none is reachable or installed, it installs a **verified llama.cpp build** and starts it on the model it just downloaded. If you already run Ollama or another OpenAI-compatible server, set `LOCAL_ENGINE` to its URL before you install and `join` wraps that instead.
4. Links the machine to your account with an RFC 8628 device-code login. It prints a link, you open it and sign in, and that sign-in is the approval.

One detail for Intel Macs, and for an x64 agent running under Rosetta on Apple Silicon: the support matrix in the hardware docs says the llama.cpp `macos-x64` build is compiled without Metal, so the managed engine decodes on the CPU only. Choose the `macos-arm64` binary on an Apple Silicon Mac.

Run `dico-agent preflight` first if you want a no-account check of your hardware and platform support. The [CLI reference](/docs/provider/cli-reference) describes what it reports.

## Recognized M-series capacity classes on /earn

The [earnings page](/earn) has a "Recognized hardware" table. It maps a verified GPU model to the largest capacity class the network recognizes for it. As of this post, the table includes Apple chips: M5-ULTRA at 512GB, M2-ULTRA at 192GB, M1-ULTRA at 128GB, and the M3, M4 and M5 Max chips at 128GB, next to H100 and other data-center cards. Absence from the table means a model is not recognized at all. When we queried the public lookup that `join` uses, an Apple M3 Ultra string returned `recognized: false`.

Read that table carefully. The hardware docs say `join` prints whether your detected GPU resolves to an entry, and that this shows what your hardware *would* be recognized for once hardware attestation exists. It is not a claim that anything is being enforced or paid against it today. The table can also change, so treat [/earn](/earn) as the source of truth.

The estimator on that page has no Mac preset. You enter your own throughput, which is where `dico-agent benchmark` comes in.

## Keeping a Mac awake and online

A provider node is only useful while it is running, and a Mac's default is to sleep. The docs don't prescribe a setting here, so these are general macOS points, not DiCompute requirements:

- Stop the Mac sleeping while it is on power, in System Settings under Energy (or Battery on a laptop).
- Run the agent as a service rather than in a terminal window. `dico-agent install-service` renders and bootstraps a launchd LaunchAgent on macOS, and `--dry-run` prints exactly what it would write first.
- The agent reconnects by itself after a coordinator-side disconnect, so a network blip doesn't need a manual restart.
- The installer drops a "DiCompute Agent Status" launcher in `~/Applications`. Double-click it to run `dico-agent status`.

Updates don't happen by themselves. Nothing fetches a new release unless you run `dico-agent update`, or opt in to a periodic check with `dico-agent update --auto on`; see [upgrading](/docs/provider/upgrading) in the provider docs.

## Expectations today

To be plain about it:

- **No traffic is guaranteed.** The fleet path serves one internal test account.
- **No earnings exist.** The docs say a claim is a record, not a payment, and withdrawals are not open.
- **No hardware floor is enforced.** A smaller Mac simply advertises less capacity. Your engine does have to pass a real readiness check before the worker registers.
- **Your Mac can read what it serves.** Prompts reach your engine as plain text.

## Next steps

- [/download](/download): the installer and per-platform checksums.
- [/earn](/earn): the estimator and the recognized hardware table.
- [Hardware requirements](/docs/provider/hardware-requirements): what the agent checks and what "capacity" means.
- [Troubleshooting](/docs/provider/troubleshooting): the Gatekeeper section and `dico-agent doctor`.
- [Running a DiCompute provider node](/blog/running-a-dicompute-provider-node): the full provider overview.
