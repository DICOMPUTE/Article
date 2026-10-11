---
title: "Checking your machine with dico-agent preflight"
description: "Before you join anything, preflight reports your platform support, CPU, RAM, GPU, disk and connectivity, with no account needed."
date: 2026-10-11
authors: [DiCompute team]
tags: [providers, dico-agent, hardware]
categories: [providers]
cover: /blog-assets/blog/checking-your-machine-with-dico-agent-preflight/banner.webp
coverAlt: "Duotone editorial illustration: a tilted orbit ring around a solid point, with a second point travelling the ring, picked out in accent; a cyan accent on a deep ink field."
---

Home-lab and prosumer GPU owners exploring inference serving in 2026 want a
low-risk way to find out whether their hardware is worth the effort.
`dico-agent preflight` is that: a check you run before you sign in, link a
machine or download any model weights.

One honest note first. Passing preflight tells you the box can attempt to
join. It says nothing about traffic or income. Serving does not earn money by
default yet, and the fleet carries real traffic for one internal test account
only, so a worker at zero requests is normal today. See the
[operate page](/operate) for the current status.

## Why check before you install anything heavy

`dico-agent join` downloads model weights, which the
[provider storage docs](/docs/provider/storage) put at anywhere from a few GB to
over 100 GB depending on the model. It can also install an inference engine.
That is a lot of disk and bandwidth to spend before you know whether your
platform is supported or the coordinator is reachable from your network.
Preflight answers those questions first, with no account.

## Getting the binary and running it

You need the `dico-agent` binary and nothing else. Download it for your
platform from [/download](/download), or use the installer but stop before it
runs `join`. The quickstart's own recipe is to set `DICO_SKIP_LOGIN=1` before
the install, so the installer puts the binary in place and goes no further:

```bash
export DICO_SKIP_LOGIN=1
curl -fsSL https://dicompute.ai/releases/agent/install.sh | sh
dico-agent preflight
```

The installer places the binary in `~/.dico/bin`, so add that directory to
your `PATH` or call the binary by its full path. On Windows, set
`$env:DICO_SKIP_LOGIN = "1"` in PowerShell first and use the one-liner on the
download page. If you downloaded a binary by hand, run it from a terminal, for
example `./dico-agent-linux-x64 preflight` after `chmod +x`.

## What it reports

Per the [CLI reference](/docs/provider/cli-reference), preflight checks:

- **Platform support.** Whether your OS and CPU architecture ship a prebuilt
  binary. If not, you get a WARN, not a FAIL, because a source build can
  still work.
- **Hardware.** CPU, RAM and GPU. Informational only.
- **Free disk** at the install directory. Also informational.
- **Reachability**, but only for what you have configured. More on that next.

Here is a real run of the v0.6.11 Linux x64 binary on a CPU-only machine with
nothing configured (the disk path is shortened):

```text
[PASS] platform -- linux/x64 ships a prebuilt dico-agent binary (linux-x64)
[INFO] hardware -- 8 CPU core(s), 28 GiB available of 32 GiB RAM, GPU: none detected. No minimum GPU, VRAM, RAM, CPU, or disk size is enforced anywhere in the codebase -- a smaller box just advertises less capacity; it is never refused for being small.
[INFO] disk -- 200 GiB free at ~/.dico/agent (no minimum enforced -- engine + model weights vary widely in size)
[PASS] coordinator -- https://dicompute.ai/health responded (HTTP 200, gateway version 2026.10.11)
[INFO] local engine -- LOCAL_ENGINE is not set -- `dico-agent join` will auto-install one on Linux/macOS, or point LOCAL_ENGINE at your own

verdict: workable
```

Add `--json` to get the full `{ranAt, checks, verdict}` report instead, for
scripts or for pasting into a support request.

## Reachability checks

Two settings matter: `COORDINATOR_HTTP`, where the agent registers, and
`LOCAL_ENGINE`, the inference engine's base URL (the default engine URL is
`http://localhost:8000`). Preflight tests them only if they are set, either in
your environment or in a saved `agent.json` from an earlier `join`. An unset
value reports as INFO, never as a made-up failure. The coordinator check
reuses the same health check as `dico-agent doctor`, so the two cannot
disagree.

Pointing `LOCAL_ENGINE` at something that is not running shows what a failure
looks like:

```bash
LOCAL_ENGINE=http://127.0.0.1:8000 dico-agent preflight
```

```text
[FAIL] local engine -- LOCAL_ENGINE (http://127.0.0.1:8000/v1/models) unreachable: Unable to connect. Is the computer able to access the url?
```

One side effect to know about: if a saved `agent.json` from an earlier install
still names a retired coordinator host, `dico-agent` can rewrite it to the
current address and keep a `.bak` copy of the old file. We saw that happen on a
machine that had been set up before the host change. It is harmless, but
it means preflight is not guaranteed to leave an existing install's config
byte-for-byte untouched.

## The verdict, and the exit code

The last line is one of three words:

| Verdict | Meaning | Exit code |
|---|---|---|
| `ready` | Platform supported, coordinator and engine both reachable. This box could serve today. | 0 |
| `workable` | Nothing is broken, but an engine still needs configuring, which `join` does for you. The normal fresh-box case. | 0 |
| `blocked` | The coordinator is unreachable, so nothing else can work. | 4 |

Notice that the unreachable local engine did not turn the verdict into
`blocked`: that run still ended `workable`. Only the coordinator being
unreachable blocks.

## No enforced hardware floor

The [hardware requirements](/docs/provider/hardware-requirements) page is the
human-readable source of truth for what preflight checks against. Its
headline: no minimum GPU, VRAM, RAM, CPU or disk is enforced. The agent reads
your real memory headroom and advertises capacity to match, so a small box
advertises a small number and is not turned away for it. What you need is
whatever your own engine needs to serve your chosen model at a speed you accept.

Two limits to know. A separate readiness gate at startup refuses to register a
worker whose engine cannot actually answer, so "no floor" does not mean
"anything works". And a CPU-only box gets a coarse CPU tier (low, mid or high,
by core count) that describes the class of machine, not a measured speed.
`dico-agent benchmark` is the way to get a real number.

## Reading the result

Read each line against the hardware page. A PASS on platform and a reachable
coordinator mean the install path is open. A WARN on platform means there is
no prebuilt binary for your target. Free disk is yours to judge against the
model you intend to serve. If you get `workable`, the next step is yours to
choose, and nothing has been linked to an account yet.

## Next steps

- [Hardware requirements](/docs/provider/hardware-requirements): what is and
  is not checked.
- [CLI reference](/docs/provider/cli-reference): every flag and exit code.
- [/download](/download): binaries and one-line installers.
- [Running a DiCompute provider node](/blog/running-a-dicompute-provider-node):
  what happens after `join`.
