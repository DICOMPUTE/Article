---
title: "Verifying the dico-agent binary before you run it"
description: "Checksums, the signed release manifest, and why macOS and Windows warn you: a supply-chain-minded guide to installing a provider agent."
date: 2026-10-11
authors: [DiCompute team]
tags: [providers, security, supply-chain]
categories: [providers]
cover: /blog-assets/blog/verifying-the-dico-agent-binary-before-you-run-it/banner.webp
coverAlt: "Duotone editorial illustration: a tilted orbit ring around a solid point, with a second point travelling the ring, picked out in accent; a cyan accent on a deep ink field."
---

Software supply-chain attacks on developer tooling kept install verification in
the news through 2026, and piping a script into a shell is a fair thing to be
wary of. This post shows what the `dico-agent` installer checks, how to check a
download yourself, and why macOS and Windows will warn you about it.

The honest summary: the binaries are checksummed and listed in a signed
manifest, and you can verify the checksum by hand. The macOS and Windows
binaries are **not** signed by Apple or Microsoft, so those operating systems
will warn you, and the warning is correct.

## Why you should care what runs on your GPU box

A provider agent runs on a machine you own, holds a signing identity, and
receives users' prompts in plaintext. Anyone who can swap that binary can read
those prompts and sign as you. The [security model](/docs/provider/security-model)
says to protect `identity.json` like a private key, and the same logic applies
to the program that holds it.

## What `install.sh` checks

The one-line installer (`curl -fsSL https://dicompute.ai/releases/agent/install.sh | sh`)
works out your OS and CPU, downloads the matching binary, and checks it against
its published SHA-256 and a signed manifest before it runs anything. It covers
seven targets: linux-x64, linux-arm64, linux-x64-musl, macos-x64, macos-arm64,
windows-x64 and windows-arm64. The [download page](/download) says each binary
is verified against its checksum and the signed manifest.

Be clear about what that protects. The one-liner trusts dicompute.ai to serve a
genuine installer script. The quickstart says so directly: the script cannot
verify its own signature before it has started running. If that trust is too
much for your threat model, use the inspect-first path below.

The quickstart's version is to download the installer, read it, and run it
only after you are satisfied:

```bash
curl -fsSL https://dicompute.ai/releases/agent/install.sh -o install.sh
less install.sh
sh ./install.sh
```

A signature for the script, `install.sh.sig`, is published beside it. The
public key it verifies against is not served from dicompute.ai on purpose,
because a compromised host could serve its own key next to its own signature.
The quickstart fetches the key from git instead, which needs read access to a
private repository. If you do not have that access, the checksum comparison in
the next section is the check you can make yourself.

## Verifying a manual download

If you download a binary directly, check it before you run it. The
[verified builds page](/verified-builds) lists every binary's full SHA-256 and
the exact command for your platform:

```bash
sha256sum dico-agent-linux-x64
```

On macOS use `shasum -a 256 dico-agent-macos-arm64`. On Windows PowerShell use
`Get-FileHash .\dico-agent-windows-x64.exe -Algorithm SHA256`. Compare the
output to the page. A match proves you have the exact bytes the release
pipeline published. It does not prove who published them: the page says a
checksum "is not a substitute for a code-signing signature".

## The release feeds

The same hashes are published in machine-readable form, so you do not have to
trust a page layout. For v0.6.11 (check `latest.json` for the current
version), these live under `https://dicompute.ai/releases/agent/`:

- `latest.json` names the current version.
- `v0.6.11/release.json` lists each target with its SHA-256.
- `v0.6.11/manifest.json` maps every artifact to its SHA-256, and
  `v0.6.11/manifest.sig` is the signature over those exact bytes.
- Each binary has a `.sha256` sidecar next to it.

There is also a public runtime manifest on the gateway at
`/v1/runtime/manifest`. A quick cross-check from a shell:

```bash
curl -sS https://dicompute.ai/v1/runtime/manifest \
  | jq -r '.versions[0].targets[] | select(.target=="linux-x64") | .sha256'
sha256sum dico-agent-linux-x64
```

The two hashes should match each other and the one on the verified builds
page. We ran this against v0.6.11: the downloaded Linux x64 binary matched the
published hash. It is a consistency check, though, because all of these come
from the same host. An attacker who controlled that host could change them
together. The signature on `manifest.json` is what a mirror cannot forge.

## Gatekeeper and SmartScreen

macOS and Windows warn because the binaries carry no publisher signature. The
[download page](/download) says the macOS binaries are unsigned and not
notarized, and the Windows binaries carry no Authenticode signature. Signing
needs a paid Apple Developer account and a purchased certificate, which the
project does not have yet. It is tracked publicly with no ETA.

- **macOS.** A browser download triggers "Apple could not verify ... is free of
  malware". Verify the checksum first. Then `xattr -d com.apple.quarantine
  ./<file>` clears the quarantine flag your browser attached. On macOS 14 and
  earlier, Control-click and Open works. On macOS 15 and later, use System
  Settings, Privacy & Security, Open Anyway. The page expects the curl-based
  installer not to hit this dialog, but says it could not confirm that on a
  Mac, so report it if it does.
- **Windows.** SmartScreen says "Windows protected your PC". Run
  `Get-FileHash` and compare. Then choose More info, then Run anyway.

Neither warning is a false alarm to click through on reflex. They are accurate
statements about an unsigned binary. Checking the hash first is what turns
"unsigned" into "unsigned but byte-identical to what was published".

## Mirroring releases for your own fleet

If you run several machines or an air-gapped network, you can mirror the
release tree and point installs at it with `DICO_RELEASE_URL`. The
[mirroring guide](/docs/provider/mirroring) lists the required layout
(`latest.json`, `<version>/release.json`, the binaries, their `.sha256`
sidecars, `manifest.json` and `manifest.sig`) and notes that a version
directory is immutable once published.

The key point for supply-chain thinking: copying a signed release tree
byte-for-byte is safe whichever host serves it, because the installer trusts
the signature and not the transport. A mirror that substitutes even one byte of
a binary breaks the signed manifest. Copying an unsigned release is only as
trustworthy as whoever runs the mirror, so do not point `DICO_RELEASE_URL` at
one you do not control.

## Next steps

- [Verified builds](/verified-builds): the checksum and the command for every
  platform.
- [/download](/download): the installers and the platform warnings.
- [Mirroring the release feed](/docs/provider/mirroring): the layout and the
  trust rules for your own mirror.
- [Security model](/docs/provider/security-model): what the agent sends off
  your machine, and what it stores.
- [Running a DiCompute provider node](/blog/running-a-dicompute-provider-node):
  the whole provider side.
