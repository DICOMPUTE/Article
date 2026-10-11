---
title: "Measuring your real throughput with dico-agent benchmark"
description: "Replace guesses with a measurement: run the benchmark against your engine and feed the number into the earnings estimator."
date: 2026-10-11
authors: [DiCompute team]
tags: [providers, benchmark, performance]
categories: [providers]
cover: /blog-assets/blog/measuring-throughput-with-dico-agent-benchmark/banner.webp
coverAlt: "Duotone editorial illustration: a tilted orbit ring around a solid point, with a second point travelling the ring, picked out in accent; a cyan accent on a deep ink field."
---

Benchmarking consumer GPUs for language models was a constant topic in 2026's local-AI communities, and the numbers people post rarely match what you get. Speed depends on the model, the quantization, the engine, the settings and the machine's thermals. The only figure that matters for your box is the one you measure on it.

This post shows how to measure it with `dico-agent benchmark`, what changes the result, and what to do with the number. It is for providers who already have an engine running. The commands are quoted from the [CLI reference](/docs/provider/cli-reference) and the [hardware requirements](/docs/provider/hardware-requirements) page, and we did not run them while writing this post, so confirm them against the docs for your agent version.

This post doesn't quote a tokens-per-second figure for any hardware. A number from someone else's machine tells you little about yours, which is the point of this post.

A status note first. The [earnings estimator](/earn) is "a projection, not a payout". Serving doesn't earn anything today, the fleet path carries real traffic for one internal test account only, and a new worker sitting at zero requests is normal. A benchmark helps you understand your hardware. It doesn't promise any income.

## Why your own number beats published ballparks

The estimator page asks for "your throughput (tokens/sec)" and says to run `dico-agent benchmark` for a real number. It has a hardware preset list that pre-fills throughput and power with "published ballpark specs", and you can override either value. Those presets are a starting guess. They can't know which engine, quantization or context settings you use.

The page is also explicit that the throughput field is your own input on purpose, because the platform is bring-your-own-engine. A measured number replaces a guess with something you can repeat.

## Running dico-agent benchmark

The command runs a short real-inference request against your configured `LOCAL_ENGINE` and `MODEL_ID` and prints throughput:

```bash
dico-agent benchmark
```

It needs no account or login, only a reachable engine. You can point it elsewhere for one run, without changing your saved configuration:

```bash
dico-agent benchmark --engine http://127.0.0.1:8000 --model <model id>
```

For scripts, `--json` prints the measurement as the only thing on standard output: the model id, the decode rate in tokens per second, the time to first token in milliseconds and a timestamp. That is handy for comparing boxes or checking that an engine upgrade didn't slow things down.

```bash
dico-agent benchmark --json
```

Every plain run is also recorded to `benchmark-report.json` in the agent's home directory. Two numbers are worth separating when you read the output:

- **Decode speed** is how fast the engine generates new tokens once it has started. It is what most people mean by tokens per second.
- **Time to first token** is the wait before output begins. It grows with long prompts and with a model that has to load.

In text mode the command may also print a projection line. The docs say it fetches the model's current listed price from the public model list and prints a ceiling projection that assumes the box runs flat out around the clock. It is labeled as a projection, never a payout or a promise, and it points you to the estimator for a more realistic figure. Treat it as an upper bound at today's listed rate, not a forecast.

## What affects throughput

Four things move the number most:

- **Model size.** Bigger models generate more slowly on the same hardware. Compare like with like.
- **Quantization.** A more heavily quantized model is smaller and usually faster, at some cost in output quality. Check the model's quantization in the catalog (`dico-agent models catalog`).
- **Engine.** llama.cpp, Ollama, vLLM and SGLang schedule work differently, and the support matrix in the hardware docs shows which engines run on which operating systems. vLLM and SGLang are Linux-only in practice.
- **Concurrency.** A single request is a different workload from several at once.

The CLI reference describes a sweep for that last one:

```bash
dico-agent benchmark --sweep --batch-sizes 1,2,4,8
```

It runs several concurrent streams at each batch size and reports, per setting, the time to first token and the aggregate decode rate. Batch sizes are capped at 64, so a typo can't launch an uncontrolled number of streams at your engine. Results go to a separate sweep history (`dico-agent benchmark sweep-history` lists it).

On CPU-only boxes, the hardware docs add a caution. The agent classes them as low, mid or high by core count, but says plainly that a core count can't be turned into a tokens-per-second figure, and that a high-core-count machine doesn't get proportionally more throughput because CPU inference is typically limited by memory bandwidth. Only a measurement tells you.

There is one more option worth knowing about. `dico-agent benchmark --parity` replays a fixed set of prompts at temperature 0 and compares the output with a baseline you pinned earlier. It exists to catch an engine that is fast but wrong, for example from a bad quantization or chat template. A fast number from a broken engine is no use.

## Repeating runs for a stable figure

One run is a sample, not a result. Laptops and small desktops throttle when hot, a second process can steal memory bandwidth, and the first run may include warm-up.

A sensible routine:

1. Close other heavy applications and let the machine idle for a minute.
2. Run the benchmark several times, with a pause between runs, on the same model and engine settings.
3. Look at the spread. If the runs agree closely, use their typical value. If the last runs are slower than the first, thermal throttling is a likely cause.
4. Change one thing at a time (model, quantization, engine flag) and measure again.

The agent helps with this. Each plain run appends an entry to a bounded history, newest ten by default, and `dico-agent benchmark history` lists it with the timestamp, model and decode rate. If speed drops after an engine update, you have a record of before and after.

## Using the number in /earn

Open the [earnings estimator](/earn) and enter your measured decode rate as "Your throughput (tokens/sec)". Then fill in the rest with your own figures: hours online per day, an assumed utilization, power draw in watts and your electricity rate. The page explains its arithmetic: monthly tokens are your throughput multiplied by hours, days and utilization, priced at the reference model's current listed output rate, and electricity is charged for all the time you're online, including idle time.

Two things to keep in mind. First, utilization is "your guess": the page says DiCompute doesn't set or promise one, and today the fleet serves one internal test account, so the honest real-world figure is near zero. Second, the page's own example can show a negative monthly net, because electricity costs add up even when the machine does little. The estimator is there to show you that arithmetic before you plug a box in, not to sell you a figure.

## Decode speed in signed heartbeats

The number you measure also has a second life. Once a connected worker has done real work, the agent's signed heartbeat carries its observed decode speed, next to the worker id, its running and waiting request counts and a timestamp. The [security model](/docs/provider/security-model) lists the heartbeat's fields and notes that the decode speed appears only once non-zero work has actually happened.

So a benchmark isn't a certificate you hand in. The signed speed comes from real serving. The CLI reference does say a full heartbeat can also carry your benchmark figure as optional telemetry outside that signed core, and that without a speed figure the router ranks a warming-up worker on a fleet-wide median for longer. `AGENT_HEARTBEAT_DETAIL=minimal` strips that optional telemetry if you'd rather not send it. How a worker's speed feeds into routing is covered by the [reputation docs](/docs/provider/reputation), which also say whether reputation changes the traffic it gets.

## Next steps

- [/earn](/earn): the estimator, where your measured number goes.
- [CLI reference](/docs/provider/cli-reference): every `benchmark` flag, including `--sweep`, `--parity` and `history`.
- [Hardware requirements](/docs/provider/hardware-requirements): what "capacity" means and what is, and isn't, checked.
- [Running a DiCompute provider node](/blog/running-a-dicompute-provider-node): the overview, including what isn't live yet.
