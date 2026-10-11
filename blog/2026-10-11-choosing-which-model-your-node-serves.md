---
title: "Choosing which model your node serves"
description: "join picks a published model or the one you name. How to match a model to your memory, read the catalogue, and see what people are asking for."
date: 2026-10-11
authors: [DiCompute team]
tags: [providers, models, hardware]
categories: [providers]
cover: /blog-assets/blog/choosing-which-model-your-node-serves/banner.webp
coverAlt: "Duotone editorial illustration: a tilted orbit ring around a solid point, with a second point travelling the ring, picked out in accent; a cyan accent on a deep ink field."
---

Choosing the right open model for consumer hardware was a top home-lab question in 2026, and for a DiCompute provider it is the main decision you make. The agent can pick for you, but it helps to know how, and how to override it.

This post covers how `dico-agent join` chooses a model, where to read the catalog, how memory decides what fits, how to see what people have asked for, and how to switch later. It is for providers with a machine in front of them. The commands are quoted from the [provider quickstart](/docs/provider/quickstart), the [CLI reference](/docs/provider/cli-reference) and the [hardware requirements](/docs/provider/hardware-requirements) page, and we did not run them while writing this post.

A status note, because model choice sounds like it should decide your income. It doesn't, today. The fleet path carries real traffic for one internal test account only, and serving earns nothing yet. We have no demand figures for any model, so this post says nothing about which one is popular. Choose a model your machine can run well, not one you hope will be busy.

## Why model choice decides whether your box is useful

Your node can only answer requests for the model it serves. If the model is too big for your memory, the engine won't load it or will crawl. If it is tiny, the box serves a model that may not be what anyone asks for. Memory fit comes first, then speed, then whether the model is one the network lists.

The agent also enforces a basic gate. The hardware docs say the worker is refused registration until your engine lists your configured model and streams a real one-token completion. A model that doesn't load never reaches the network.

## How join picks a model, or uses the one you name

By default, `dico-agent join` picks a published model for you: the largest one that fits your machine. A model you have already downloaded wins over one you haven't, a model that won't fit is never offered, and a guard stops it choosing something likely too slow on a CPU-only box.

You have three ways to steer it:

- **Name one at install time.** Set `DICO_MODEL=<model id>` before the installer runs, or run `dico-agent join --model <model id>`. An explicit choice beats the automatic pick. The quickstart advises against exporting `MODEL_ID` yourself, because a stale value can overwrite what `join` persists.
- **Pick the smallest.** `dico-agent join --fast` inverts the default and chooses the smallest published model that fits, which gets you serving sooner because there is less to download.
- **Choose interactively.** On a real terminal, plain `join` shows every catalog model with its size, whether it fits and whether it's downloaded, with the recommended one preselected. Press Enter to accept it.

If you ask for a model the picker flags as likely too slow on a CPU-only machine, `join` refuses unless you add `--allow-slow`. To preview without downloading or changing anything, run `dico-agent join --dry-run`, which prints the plan and exits.

## Reading the catalogue: context, min_ram_gb where published

You can see what's published without an account. Locally, `dico-agent models catalog` lists the coordinator's catalog with a fit verdict for your machine, and `dico-agent models info <id>` expands one row. The same data is in a public feed at `https://dicompute.ai/v1/models/catalog`, and the consumer-facing list is at [/models](/models).

The fields that matter most for a provider are the context window, the quantization (how compressed the weights are) and `min_ram_gb`, the memory the model needs. That last one is only filled in where it has been published. When we read the catalog feed, it listed three models with these values, which will change:

| Model | Quantization | Context | `min_ram_gb` |
|---|---|---|---|
| `qwen2.5-0.5b-instruct` | q4_k_m | 32,768 | 2 |
| `qwen2.5-3b-instruct` | q4_k_m | 4,096 | 6 |
| `ternary-bonsai-2-27b` | PTQ1_0 | 32,768 | 8 |

Note two things. The consumer-facing [/models](/models) page and `/openai/v1/models` list five models, and show a different context window for `qwen2.5-3b-instruct` (1,024 tokens, the window callers get today) from the coordinator's catalog. They answer different questions: what a caller can send, and what an engine can load. And a missing `min_ram_gb` means unknown, not zero. The consumer feeds don't carry `min_ram_gb` for every model, so for fit, rely on the coordinator's catalog or `dico-agent models catalog`.

Whether a model is open to callers on the fleet is a separate matter again. Today the fleet path serves one internal account, so never assume that serving a model puts it in front of users.

## Memory headroom and advertised capacity

The agent's fit check is simple and the same everywhere: a model fits when its `min_ram_gb` is at most your free video memory (on a GPU box) or available system memory, minus a reserve. The reserve is 2 GB by default (`AGENT_MEMORY_RESERVE_BYTES`). Total RAM is never the measure. The docs give an example of the refusal text: it prints the figures it compared, such as a model needing 3 GB on a box with 0.6 GB usable.

Your free memory also sets how much concurrent work your worker advertises. The hardware docs say a box with little free memory simply advertises a smaller capacity, and no hardware floor is enforced. Close other heavy programs before you join, because the agent reads memory headroom at that moment.

Run `dico-agent preflight` first if you want a no-account look at your detected CPU, memory, GPU and disk. And after you choose, `dico-agent benchmark` tells you how fast your pick actually runs.

## The request-a-model board

If the model you'd like to serve isn't published, or you want a model added, the [request a model](/models/request) board is where people ask for them. When we read it, the board's public feed was empty, so there is no signal to draw from it yet, and it says nothing about demand. Treat it as a way to tell the project what you want, not as a leaderboard.

## Switching models later

You aren't locked in. The CLI reference describes two paths:

```bash
dico-agent models use <model id>
dico-agent restart
```

`models use` checks the id against the catalog and your machine's fit, refuses an unknown or won't-fit id, and refuses if the weights aren't downloaded yet (it points you at `download-model` instead of fetching them). It also refuses while the agent is running, since a running agent wouldn't pick up the change. `--dry-run` shows what would be selected without writing anything.

The quickstart gives the other route: stop the agent, run `dico-agent join --model <id>`, then restart. If you re-run `join` for an upgrade, it keeps your already-downloaded configured model unless you pass `--model`.

If you bring your own engine, remember the model id has to match what your engine reports. `dico-agent models` queries your engine directly and marks the configured one, which catches spelling mismatches.

## Next steps

- [/models](/models): the public model list.
- [Request a model](/models/request): ask for one that isn't there.
- [Provider quickstart](/docs/provider/quickstart): `join`, `--model` and `--fast` in context.
- [Hardware requirements](/docs/provider/hardware-requirements): the fit rule and what "capacity" means.
- [Running a DiCompute provider node](/blog/running-a-dicompute-provider-node): the overview, including what isn't live yet.
