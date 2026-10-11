---
title: "Bringing your own inference engine to DiCompute"
description: "Already running vLLM, SGLang, llama.cpp or Ollama? Point dico-agent at it with LOCAL_ENGINE, on the same box or across your network."
date: 2026-10-11
authors: [DiCompute team]
tags: [providers, vllm, ollama]
categories: [providers]
cover: /blog-assets/blog/bringing-your-own-inference-engine/banner.webp
coverAlt: "Duotone editorial illustration: a tilted orbit ring around a solid point, with a second point travelling the ring, picked out in accent; a cyan accent on a deep ink field."
---

Local inference engines such as Ollama, vLLM and llama.cpp went mainstream
with home-lab users in 2025 and 2026. If you already run one, you do not need
a second copy to try the provider side of DiCompute. `dico-agent` can wrap the
engine you have. This post covers how, and where the sharp edges are.

The status line first, as in every provider post: serving does not earn money
by default yet, and the fleet carries real traffic for one internal test
account only. A worker you connect will probably sit at zero requests for now.
That makes this a good time to get the plumbing right, and not a reason to
expect income. See the [operate page](/operate).

## Your engine, or the one `join` installs

`dico-agent join` sets up a machine in one command. If no inference engine is
running on Linux or macOS, it installs a verified llama.cpp build and starts
it. If you already run an engine, tell the agent where it is and it wraps that
engine instead. There is no list of approved engines. The
[hardware requirements](/docs/provider/hardware-requirements) page sets the
bar: an OpenAI-compatible server that answers `POST /v1/chat/completions` with
streaming (SSE) and `GET /v1/models`. vLLM, SGLang, llama.cpp, Ollama or your
own server all qualify.

## Setting `LOCAL_ENGINE`

`LOCAL_ENGINE` is the base URL of your engine. The default is
`http://localhost:8000`. The [provider quickstart](/docs/provider/quickstart)
says to set it before you install, because the installer's default `join`
reads it at that moment and saves what it finds. Setting it afterward would
save the wrong value.

```bash
export LOCAL_ENGINE=http://127.0.0.1:8000
export COORDINATOR_HTTP=https://dicompute.ai
export COORDINATOR_WS=wss://dicompute.ai/ws/worker
```

The quickstart sets the two coordinator variables too, because the built-in
default is a local-development value. Run the install from the same shell. Do
not export `MODEL_ID` yourself: `join` picks and saves a real published model,
and a stale value you exported can overwrite that choice. If you want a
particular model, name it with `DICO_MODEL`, or pass `join --fast` to prefer
the smallest published model known to fit your box.

## Engine choice per platform

The quickstart's matrix is blunt about what actually ships a usable build:

| Engine | Linux | macOS | Windows |
|---|---|---|---|
| llama.cpp | Prebuilt; `join` can install it | Prebuilt; `join` can install it | Official builds; install it yourself |
| Ollama | Yes | Yes | Yes, with a Windows installer |
| vLLM | Yes, the GPU-default path | No published wheels | Effectively no; use WSL2 or another engine |
| SGLang | Yes | Linux-only in practice | Linux-only in practice |

On Windows, the realistic choices today are llama.cpp and Ollama. An engine the
agent does not recognize from its version endpoint is reported as `unknown`
and still serves. The report is just less specific.

## Matching the model id

Your engine registers models under its own names, and the agent advertises one
model id to the coordinator. When they differ, the agent has to send requests
to a name the engine does not know. `dico-agent start` guards against this: if
`ENGINE_MODEL_ID` is a plain name that differs from `MODEL_ID`, it logs a loud
`[engine-model-guard]` warning and keeps running. By default it only warns.

The [troubleshooting page](/docs/provider/troubleshooting) gives the fixes:

- Correct `ENGINE_MODEL_ID` or `MODEL_ID` so they agree.
- If your engine really registers the model under another name, set
  `MODEL_ALIAS_ALLOW=<your MODEL_ID>`.
- An absolute path is accepted without a warning, because an unaliased
  llama-server registers a model under its GGUF path.
- Set `ENGINE_MODEL_ID_GUARD_ENFORCE=1` to make the agent refuse to start on a
  mismatch. The page says a future release will enforce by default.

The guard is described as a misconfiguration check for honest operators, and
not a security control.

A stricter gate applies at startup. The agent will not register your worker
until your engine answers `/v1/models` with your configured model present and
streams a real one-token completion. A box that is not ready yet keeps
retrying in the background and does not register broken.

## Running the engine on another machine

You can point `LOCAL_ENGINE` at another host, for example a GPU server in the
next room. Be deliberate about it, because the quickstart is clear about the
trade: the agent decrypts every prompt it receives and forwards it to your
engine. If that engine sits on a host you do not control, the prompt leaves
your trust boundary.

The rules the docs state:

- The safest setup is a same-box engine, reached over a unix socket
  (`LOCAL_ENGINE=unix:/run/<engine>.sock`) or over loopback HTTP with
  `LOCAL_ENGINE_TOKEN` set.
- A remote engine must use `https://`.
- Plain `http://` to a non-loopback host is refused unless you deliberately set
  `DICO_ALLOW_REMOTE_ENGINE=1`. Do that only on a network you trust end to end.

Prompts reach a provider in plaintext either way, so decide who you are
willing to let read them.

## Verifying with `dico-agent doctor`

Run the doctor before you trust the setup. `dico-agent doctor` runs a series of
independent checks and never lets one failure hide another. Its "local engine"
check verifies that your engine is reachable and lists your configured model.
Per the hardware page, that is a liveness and configuration check, not a
capacity or performance one.

To check just the engine while you iterate on a fix, narrow the run with
`--check "local engine"`. The check names are the plain strings the doctor
prints, and an unrecognized name exits with a usage error listing the valid
ones. `--offline` skips the checks that need the coordinator, which helps
when you are triaging a box that has dropped off the fleet.

For a first look at your engine in isolation, `dico-agent preflight` reports
whether `LOCAL_ENGINE` is reachable without needing an account. For a
passthrough test with no coordinator and no login, there is also a direct mode
(`dico-agent local`).

We make no claims about how fast any engine will be on your hardware. Use
`dico-agent benchmark` to measure your own.

## Next steps

- [Provider quickstart](/docs/provider/quickstart): the full walkthrough.
- [Troubleshooting](/docs/provider/troubleshooting): what each doctor check
  means, and the fix for each.
- [/operate](/operate): the current status of the provider path.
- [Running a DiCompute provider node](/blog/running-a-dicompute-provider-node):
  the whole provider side, start to finish.
