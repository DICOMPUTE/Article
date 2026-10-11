---
title: "Who runs the model answering you?"
description: "DiCompute's two sides explained for users: the operator's own engine today, a network of independent providers being built, and what that means for you."
date: 2026-10-11
authors: [DiCompute team]
tags: [network, explainers, open-compute]
categories: [product]
cover: /blog-assets/blog/who-runs-the-model-answering-you/banner.webp
coverAlt: "Duotone editorial illustration: a tilted orbit ring around a solid point, with a second point travelling the ring, picked out in accent; an amber accent on a deep ink field."
---

Decentralized physical infrastructure for AI compute, often shortened to DePIN, was one of the most hyped ideas of 2026. If you've used DiCompute, a fair question is: when I send a message, whose computer answers it?

Here is the straight answer. Today, most replies come from an engine the DiCompute operator runs itself. A network of independent providers exists as built software, and it carries real traffic for one internal test account only. It is not serving your chats. The rest of this post explains what that means, why the open network could matter later, and what you can check for yourself.

## The usual model: one company's data centre

With most AI chat services, one company owns the computers, runs the models, sets the price and keeps the records. That is simple, and it has a known weakness: you rely on that one company for availability, pricing and honesty about what happened to your request. If it changes a price or goes down, there is nowhere else to go.

## DiCompute's two sides

DiCompute is built with two sides:

- **People using models.** You open the [console](/console) or call the API, pick a model and pay for the tokens you use. A token is roughly a short word or part of one.
- **Providers running models.** Anyone with suitable hardware can install the `dico-agent` program, connect it to the network and offer to serve requests. The [operate page](/operate) describes how.

The idea is that providers add more hosts, and that prices and records of what was served are visible instead of private. That is the design. The next section covers how much of it is in use.

## Today: the operator's engine, plus one test account

Being plain about status matters more than the pitch:

- **Most replies** are served by the operator's own engine, directly. The model that accepts requests this way today is a small CPU-served model. [/llms.txt](/llms.txt) states that production requests are served direct-to-engine.
- **The provider fleet** is real software with real workers connected, but it carries traffic for one internal test account only. The [operate page](/operate) says the same.
- **Provider payouts are not open.** Providers are not being paid today. Anyone running a node now is helping test the network, not earning from it.

So when you chat today, a company-run engine is answering you. The other models in the [catalogue](/models) are marked as fleet-served in the pricing feed, so don't assume you can use one. Check whether a model is accepting requests before you rely on it.

## Why an open network could matter

If the network grows, these are the things it could change:

- **More hosts.** Capacity wouldn't depend on a single operator's hardware.
- **Visible prices.** Rates are listed per model on the [pricing page](/pricing), read from the live catalogue.
- **Verifiable records.** For requests that go through the provider fleet, a signed receipt is created for each one, and a public verifier can check it. Requests served by the operator's own engine produce no receipt today.

Each of these is a possibility, not a guarantee, and DiCompute doesn't claim any of them is complete.

## What you can check yourself

You don't have to take this post's word for the status. Three public pages show the network's own state:

- [/stats](/stats) shows network activity and per-model availability.
- [/status](/status) shows whether the service is healthy right now, with data. It reports when things are degraded.
- [/transparency](/transparency) explains how billing and records work, and states that serving by independent operators is canary-only so far.

Read them with a skeptical eye, then compare what they say with this post. Where a page and a blog post differ, trust the live page.

## What it means for your privacy today

Decentralization is not a privacy guarantee, and that is true here. A few facts:

- Your messages travel over TLS, which protects them in transit.
- The operator can read prompts and replies. DiCompute's sealed lane, designed to hide prompts from the network edge in front of the service, is built but switched off. Even sealed, the service still reads a prompt in order to run it.
- If a request is ever routed to a provider's machine, that provider would also be able to read it. The [privacy expectations](/docs/privacy-expectations) page covers this, including that a provider's own statements about not keeping data are self-reported and unchecked.
- No model on the list offers zero data retention.

In short, don't send regulated or confidential data. The open network is about who can run models, not about hiding your data.

## Where to go from here

- Open the [console](/console) and try a chat. For now, the engine that answers is the operator's own.
- Read the [privacy expectations](/docs/privacy-expectations) before you decide what to paste.
- Look at [/stats](/stats), [/status](/status) and [/transparency](/transparency) for the live picture.
- If you have a spare machine and are curious how provider nodes work, start at [/operate](/operate). It is explicit that nobody is paid yet.
- New to DiCompute? Read [Using DiCompute day to day](/blog/using-dicompute-day-to-day).
