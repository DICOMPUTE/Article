---
title: "Testing your engine with direct mode"
description: "dico-agent local puts a plain local HTTP server in front of your engine, with no coordinator and no login, so you can prove your setup works first."
date: 2026-10-11
authors: [DiCompute team]
tags: [providers, dico-agent, testing]
categories: [providers]
cover: /blog-assets/blog/testing-your-engine-with-direct-mode/banner.webp
coverAlt: "Duotone editorial illustration: a tilted orbit ring around a solid point, with a second point travelling the ring, picked out in accent; a cyan accent on a deep ink field."
---

Checking a new inference setup locally before you put it on a network is standard practice for home-lab operators, and the DiCompute agent has a mode built for exactly that. `dico-agent local` starts a plain HTTP server in front of your engine, with no coordinator connection and no login. If your engine answers through it, you know the engine side of your setup works before you touch the fleet.

This post is for providers who have an engine (llama.cpp, Ollama, vLLM, SGLang or another OpenAI-compatible server) and want to debug it first. A note on what this is not: direct mode doesn't serve DiCompute traffic, doesn't earn anything and doesn't connect you to the network. The provider side as a whole is described in [Running a DiCompute provider node](/blog/running-a-dicompute-provider-node), and today the fleet path carries real traffic for one internal test account only.

The commands below are quoted from the [direct mode docs](/docs/provider/direct-mode) and the [CLI reference](/docs/provider/cli-reference). We did not run them while writing this post, so check them against the docs for your agent version.

## The problem: start needs a login and a coordinator

`dico-agent start` is the command that serves the fleet. It refuses to run until you've completed a login, and it connects to the coordinator straight away. That is the right default for a real worker, but it makes debugging awkward. If something is wrong, you can't tell whether the fault is your engine, your model id, your network or the connection to the coordinator, because they all fail in the same place.

The docs state the purpose of direct mode as a single question: does my `LOCAL_ENGINE` setup work end to end? It exists to answer that question and nothing else.

## What direct mode is: a local passthrough

In the docs' words, direct mode is "a thin, honest passthrough". The agent listens on a local port and forwards requests to your engine. There is no routing, no pricing, no accounting. The docs note that the mode is called "standalone mode" in the agent's own `--help` output, so you may see both names.

It exposes three routes:

| Route | What it does |
|---|---|
| `GET /health` | Always returns `{"status":"ok"}`. It shows the local server is up, not that your engine is reachable. |
| `GET /v1/models` | Passes through your engine's own model list, with the same status and body. |
| `POST /v1/chat/completions` | Passes the request through to your engine, streaming or not, and returns whatever your engine returns. |

Anything else returns a `404` with an OpenAI-style error body. If your engine can't be reached, the two passthrough routes return a `502` with a message that starts `local engine unreachable`, instead of hanging.

## Running dico-agent local against LOCAL_ENGINE

Point the agent at your engine the way you would for a real worker, then start direct mode:

```bash
export LOCAL_ENGINE=http://127.0.0.1:8000
export MODEL_ID=<the model id your engine reports>
dico-agent local --port 8081
```

`LOCAL_ENGINE` and `MODEL_ID` are the same variables `start` reads. The default engine URL is `http://localhost:8000`. No coordinator variable is read at all.

Two flags matter:

- `--port N` (or `-p N`) sets the port. The default is `0`, which asks the operating system for a free port and prints it on startup. Pass a fixed port if you want to script against it.
- `--host H` sets the bind address. The default is `127.0.0.1`, loopback only, and that is the safe choice. The docs warn that binding anywhere else puts an unauthenticated inference proxy on your network. The CLI reference adds that an explicit non-loopback host with no token configured is refused unless you pass `--allow-unauthenticated-remote`, and that a bearer token can be required through `DICO_LOCAL_TOKEN_FILE` or `DICO_LOCAL_TOKEN`. Leave all of that alone unless you have a reason.

Not sure what model id to use? `dico-agent models` asks your engine's `/v1/models` directly and marks the one that matches your configured `MODEL_ID`, which is a quick way to catch a spelling mismatch.

## Sending a test request with curl

With direct mode running on port 8081, check the server and then your engine:

```bash
curl -sS http://127.0.0.1:8081/health
curl -sS http://127.0.0.1:8081/v1/models | jq .
curl -sS http://127.0.0.1:8081/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "<the same model id>",
    "messages": [{"role": "user", "content": "Reply with one short sentence."}],
    "max_tokens": 32
  }' | jq .
```

Read the results in order:

1. `/health` returning `{"status":"ok"}` means the local server is up. It says nothing about your engine.
2. `/v1/models` listing your model means the engine is reachable and knows the id you will serve.
3. A real completion from `/v1/chat/completions` means the engine answers chat requests end to end.

If step 2 returns a `502`, fix reachability first: the engine isn't running, or `LOCAL_ENGINE` points at the wrong address or port. If step 3 fails while step 2 works, the problem is the engine's handling of the request, such as the model, the chat template or memory, not DiCompute.

No `Authorization` header is needed in the default setup. Don't confuse this with the DiCompute API, which uses `sk-dico-` keys: direct mode never talks to DiCompute at all.

## What it doesn't do: no crypto, no ledger, no receipts

The docs list what is absent, and the list matters because a clean result here is easy to over-read. Direct mode has no end-to-end encryption, no ledger, no router and no pricing. It also doesn't produce usage receipts, the signed records a real worker makes for each request it serves.

So a successful round trip proves your engine answers OpenAI-compatible chat completions. It proves nothing about the fleet path: the coordinator handshake, your advertised capacity, pricing, receipts. The docs call it "a necessary check", not a substitute for running `start` and watching `dico-agent doctor` and `dico-agent status` against a real coordinator.

One more point from the docs: `start` always asks your engine for a streaming response, while direct mode forwards whatever the caller asked for. If you want to rehearse that, add `"stream": true` to the request above and run curl with `-N`.

## Moving from local to join and start

When the three checks pass, stop direct mode and set up the real thing:

1. Run `dico-agent join`. It picks a model, gets the weights, finds or installs an engine and links the machine to your account with a device-code login.
2. Run `dico-agent start` to connect to the coordinator and begin heartbeats.
3. Run `dico-agent doctor` and `dico-agent status` to check the connection.

The [provider quickstart](/docs/provider/quickstart) walks through each step. Expect a connected worker to sit at zero requests for now. That is normal, because only one internal test account uses the fleet path today.

If you want direct mode to survive reboots, for a development rig that doesn't talk to the network, the CLI reference says `dico-agent install-service --mode local --port N` supervises `local` instead of `start`.

## Next steps

- [Direct mode](/docs/provider/direct-mode): the full reference for the routes and flags.
- [CLI reference](/docs/provider/cli-reference): every subcommand, including `models`, `doctor` and `status`.
- [Provider quickstart](/docs/provider/quickstart): from install to a connected worker.
- [Running a DiCompute provider node](/blog/running-a-dicompute-provider-node): the overview, including what is not live yet.
