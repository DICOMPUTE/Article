---
title: "What shipped in August"
description: "A month of partner-visible API changes, in reading order: from go-live on the 6th to a published OpenAPI spec on the 29th."
date: 2026-09-02
authors: [DiCompute team]
tags: [changelog, api]
categories: [product]
cover: /blog/what-shipped-in-august/opengraph-image
---

The [changelog](/changelog) records every partner-visible change to the API
and the site, one dated entry at a time. It is exact and it is dense. This is
the same month read as a story, with the entries it draws on named by date so
you can check any line against the record.

## Going live (6 August)

The public site came up at `dicompute.ai` — landing page and the first
sign-up flow.

## Tightening the contract (8–9 August)

The request schema became strict: an unrecognized top-level field is rejected
rather than ignored, and fields from the OpenAI-compatible surface are
discriminated individually instead of blanket-rejected. Self-service sign-up
started requiring a verified-shape email.

The next day brought the controls a production key needs:
**per-account limits** on chat completions, so every key has its own ceiling;
**self-service key revocation**, whatever kind of key it is; and optional
**expiry** and **per-key spend caps**, both set when the key is minted. The
[authentication](/docs/authentication) doc describes the resulting key
lifecycle.

## Tool calling and sessions (10 August)

`tools`, `tool_choice` and `parallel_tool_calls` arrived on chat completions.
An optional `x-dico-session` request header lets a client group requests
into one session. A request too large for any worker's token budget now
returns `429` with a clear reason instead of failing later.

## Streaming and model metadata (16 August)

`stream_options` on chat and legacy completions; `context_length` and
`max_output_length` published on a model entry when an operator has
configured it, so a client can size its prompt before sending it — see
[models](/docs/models) for the fields this API adds to OpenAI's model shape.
A servability-gate rejection (`context_exceeded` and its siblings) is now a
`429` or `503` with a machine-readable code.

## Fallbacks and fingerprints (21 August)

A client-specified **model-fallback list**, `models`, on chat completions: name
the order you will accept, and the router works down it. And
`system_fingerprint` on every chat-completion response.

## A wider stable surface (23 August)

The API policy's stable-surface contract widened from 7 route families to 14 —
more of the surface a partner integrates against is now under the
deprecation and change-log rules.

## Reasoning, provenance and a spec (28–29 August)

Canonical **reasoning output** on chat completions, so models that reason
expose it in one shape regardless of upstream. `hugging_face_id` on a model
list entry when an operator has set it, so a model can be traced to its
published weights. Five more live
OpenAI-compatible route families documented, the eventing surface
(`GET /v1/events`) documented for the first time, and the drift-gated
**OpenAPI 3.1 spec** published at `/openai/v1/openapi.json`.

## Reading it yourself

Every heading above is a `## YYYY-MM-DD` entry in the changelog, and the
changelog has an RSS feed. If a partner needs to watch the surface they build
on, that feed — not this post — is the thing to subscribe to. This post is the
narrative; the record is the record.
