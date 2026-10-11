---
title: "Running dico-agent on a Windows gaming PC"
description: "The PowerShell installer, SmartScreen, engine options and what to expect when you connect a Windows GPU machine."
date: 2026-10-11
authors: [DiCompute team]
tags: [providers, windows, dico-agent]
categories: [providers]
cover: /blog-assets/blog/running-dico-agent-on-windows/banner.webp
coverAlt: "Duotone editorial illustration: a tilted orbit ring around a solid point, with a second point travelling the ring, picked out in accent; a cyan accent on a deep ink field."
---

Gamers with idle RTX cards were a key audience for 2026's distributed-compute
networks, and for good reason: most consumer GPUs live in Windows PCs. This is
a Windows-specific walkthrough of connecting one as a DiCompute provider, with
the parts that differ from Linux and macOS called out.

Expectations first. Windows is a supported install target, but the
[hardware requirements](/docs/provider/hardware-requirements) page rates
windows-x64 "best-effort": a build-time smoke test runs on Windows, and the
page says no field report yet shows a Windows box serving a real request end to
end. Serving does not earn money by default yet, and the fleet carries real
traffic for one internal test account only. A connected Windows worker at zero
requests is normal today. See the [operate page](/operate).

## Why Windows matters

The agent ships binaries for `windows-x64` and `windows-arm64`. The
[download page](/download) asks for Windows x64 or arm64. This install path
has the most friction of the three platforms, because the binaries are unsigned
and `join` does not install an engine for you.

## The PowerShell one-liner

On the [download page](/download), the documented install is a line you paste
into an already-open PowerShell prompt:

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; irm https://dicompute.ai/releases/agent/install.ps1 | iex
```

`-Scope Process` limits the policy change to that window. If you would rather
read the script before it runs, the quickstart gives a fetch-then-inspect
version:

```powershell
Invoke-WebRequest https://dicompute.ai/releases/agent/install.ps1 -OutFile install.ps1
Get-Content install.ps1 | more
.\install.ps1
```

Set your environment first, in the same window, because the installer's `join`
reads it at that moment:

```powershell
$env:LOCAL_ENGINE = "http://127.0.0.1:8000"
$env:COORDINATOR_HTTP = "https://dicompute.ai"
$env:COORDINATOR_WS = "wss://dicompute.ai/ws/worker"
```

`$env:` values live only in that window. To keep them across windows, use
`[Environment]::SetEnvironmentVariable(name, value, "User")`, and open a new
window afterward, since an already-open one will not see the change. If your
window closes by itself a few minutes into an install, the troubleshooting page
says that was a fixed bug in an older script, and re-fetching the installer
fresh should solve it.

## SmartScreen: verify, then decide

The Windows binaries carry no Authenticode signature, so the first run after a
browser download shows "Windows protected your PC". The
[download page](/download) says that is SmartScreen correctly reporting an app
with no publisher signature. Check the file first:

```powershell
Get-FileHash .\dico-agent-windows-x64.exe -Algorithm SHA256
```

Compare the result with the SHA-256 on the download page or on
[verified builds](/verified-builds). A match proves you have the exact bytes the
release pipeline published. It does not stand in for a publisher identity.
Then click More info, then Run anyway. Note these are command-line programs:
double-clicking one shows nothing, so open PowerShell in the download folder and
run `.\dico-agent-windows-x64.exe join`.

## Try preflight before you join

If you are not ready to commit, set `$env:DICO_SKIP_LOGIN = "1"` before the
install. The installer then stops after placing the binary, without running
`join`. The installer puts the binary at
`%LOCALAPPDATA%\dico\bin\dico-agent.exe`, so run `dico-agent.exe preflight`
from that folder, or the downloaded file's name followed by `preflight`. It needs no account, reports
your platform support, CPU, RAM, GPU and free disk, and ends with a verdict of
`ready`, `workable` or `blocked`. On a fresh Windows box without an engine, the
usual verdict is `workable`.

## Engines on Windows

`join` installs llama.cpp automatically only on Linux and macOS. On Windows,
bring your own engine and point `LOCAL_ENGINE` at it, per the quickstart's
engine matrix:

- **llama.cpp** ships official Windows builds. You install it yourself.
- **Ollama** ships a Windows installer.
- **vLLM** is effectively not a Windows option. Use WSL2 if you specifically
  need it, or pick one of the two above.
- **SGLang** is Linux-only in practice.

Start your engine, confirm it answers on the URL you set, and only then run
`join`. The agent will not register a worker whose engine cannot answer a real
one-token streamed completion. The
[provider quickstart](/docs/provider/quickstart) has the full engine matrix.

## Where the agent keeps its files

Per the [provider storage docs](/docs/provider/storage), the agent's runtime
state lives under `DICO_AGENT_HOME`, which on Windows is
`%LOCALAPPDATA%\dico\agent`. That folder holds `identity.json`, the agent's
signing keypair, plus `state.json` and a rotating `agent.log`. Back up and
protect `identity.json`: anyone who holds it can sign as your worker.

Model weights live outside that folder, under `MODEL_WEIGHT_ROOT`, and are the
biggest consumer of disk. Run `dico-agent storage` to see how much you are
using. If you set `MODEL_DISK_BUDGET_BYTES` the agent can evict old models,
otherwise weights grow without bound as you add models.

## Expectations: connected, idle, and unpaid

After `join` and `dico-agent start`, you will have a linked worker that
heartbeats to the coordinator. The [troubleshooting page](/docs/provider/troubleshooting)
describes the next state precisely: a connected, `doctor`-clean, heartbeating
worker with zero requests is the expected state today, because the one account
dispatching through the fleet is an internal test account.

So do not expect income. Crediting is off by default and withdrawals are not
open. If you want to test the whole path anyway, this
is the right time, and `dico-agent doctor` will tell you what is wrong if
something is.

## Next steps

- [/download](/download): the PowerShell installer and the SmartScreen notes.
- [Verified builds](/verified-builds): checksums for every binary.
- [Troubleshooting](/docs/provider/troubleshooting): SmartScreen, the closing
  PowerShell window, and a quiet worker.
- [Provider storage](/docs/provider/storage): what lives where on disk.
- [Running a DiCompute provider node](/blog/running-a-dicompute-provider-node):
  the full guide.
