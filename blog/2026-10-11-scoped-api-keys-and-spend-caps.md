---
title: "Scoped API keys and spend caps"
description: "Give every app its own key with the right scope, a spend cap and a model allowlist, and know what to do when a key leaks."
date: 2026-10-11
authors: [DiCompute team]
tags: [api-keys, security, cost-control]
categories: [engineering]
cover: /blog-assets/blog/scoped-api-keys-and-spend-caps/banner.webp
coverAlt: "Duotone editorial illustration: ruled ledger lines crossed by small tally groups, one group picked out in accent; a cyan accent on a deep ink field."
---

API keys leaked from public repositories and AI-assisted coding sessions at a rising rate through 2026, and a leaked key on a metered API is a spending problem as well as a security one. The defense is the same as everywhere else: give each app the least power it needs, put a ceiling on what it can spend, and be able to kill it fast.

This post covers the controls DiCompute gives you on a key: scopes, spend caps with reset windows, model allowlists, rotation, revocation and an IP allowlist, plus a checklist for the day a key leaks.

## One key per app or environment

Make a separate key for each app, and for each environment inside it: production, staging, a teammate's laptop, a CI job. Three things follow.

- A leak is contained. You revoke one key, and the others keep working.
- Usage is attributable. You can see which app spent what.
- Limits fit the job. A nightly script and a customer-facing service need different ceilings.

Create keys at [/settings/keys](/settings/keys). A key is shown once, so put it straight into your secret manager. An account can hold up to 50 active keys by default, and short-lived keys that the platform mints for you count while they are unexpired. You can also label keys, for example `cost-centre: research`, and group a usage export by that label ([API keys](/docs/api-keys)).

## Scopes: inference versus the rest

A key carries scopes, which say what it is allowed to do, separately from whether it can authenticate. [Authentication](/docs/authentication) lists ten. The ones you will use most:

| Scope | Grants |
|---|---|
| `inference` | Send completions to `/openai/v1/chat/completions` |
| `billing:read` | Read balance, usage, spend and receipts |
| `billing:write` | The mutating billing actions, such as starting a checkout |
| `keys:read` | List and read your own keys, nothing else |
| `keys:manage` | Everything `keys:read` does, plus create, patch, rotate and revoke |
| `storage:read` / `storage:write` | Read or write stored files |

A key minted with no `scopes` field gets `inference` alone. That is the right default for an app that only generates text. Give a reporting job `billing:read`, and give an uploader `storage:write` without `inference`. Keep `keys:manage` for the tool that provisions keys, because a key with that scope can mint and revoke the others. A key can never mint a key with more power than its own.

To mint a key from the API, send an explicit `scopes` array. This call uses a deliberately invalid key, so it returns the standard `401` and proves only that the request shape parses:

```bash
curl -sS -X POST https://dicompute.ai/openai/v1/keys \
  -H "authorization: Bearer sk-dico-invalid-example" \
  -H "content-type: application/json" \
  -d '{"scopes":["inference"]}'
```

For experiments, mint a sandbox key with `{"mode":"sandbox"}`. It is never billed and returns canned responses, but it runs auth, scopes and rate limits like a live key. It can never become live.

## Per-key spend caps and reset windows

A cap is a ceiling in micro-USD on what a key can spend. A request that would push the key past it is refused with `402` and reason `spend_cap_exceeded`, and is never partly charged. Pick how the ceiling re-opens:

| Reset | Behavior |
|---|---|
| `none` | Lifetime ceiling, the default |
| `daily`, `weekly`, `monthly` | Re-opens at a UTC calendar boundary |
| `rolling_24h`, `rolling_7d` | Each charge stops counting that long after it settled |

Set these in the New key screen or over the API, and read [API keys](/docs/api-keys) for the cap fields. A few more controls hang off the same key:

- `PUT /openai/v1/keys/:id/cap-alert` turns on an alert as the key nears its cap, 90 per cent by default, and also emits an `account.spend_cap_threshold` webhook event. The alert never blocks anything. The cap does.
- `PUT /openai/v1/keys/:id/scoped-caps` adds caps per end user, per model and per token count. The end-user cap keys off the `user` field of your request, and requests without one share a single bucket.
- Every admitted request on a capped key carries `x-dico-spend-cap-remaining-uusd` and `x-dico-spend-cap-scope` headers, so your code can see the headroom.
- `POST /openai/v1/chat/completions/estimate` takes your real request body and returns a `caps` array, including `wouldRefuse`, without reserving anything.

Cap each key at what a bug could plausibly burn in a day, not at what you can afford to lose.

## Model allowlists

A key can be limited to specific models. Leaving the allowlist unset means every configured model, and an empty list is deliberately impossible to set. Restrict a production key to the one model it uses, and an exfiltrated key then cannot be pointed at a pricier model. Today that is a short list: check `/openai/v1/models` for what exists.

## Rotation and self-revocation

Rotate on a schedule you choose and any time someone leaves. `POST /openai/v1/keys/:id/rotate` mints a new secret for the same key id. The old secret keeps working for a 24-hour overlap window, and the response's `old_secret_expires_at_ms` says exactly when it dies, so you can deploy the new value without downtime.

To revoke, a key can retire itself by possession:

```bash
curl -sS -X POST https://dicompute.ai/openai/v1/keys/revoke \
  -H "authorization: Bearer $DICO_KEY"
```

That returns `{"revoked": true}`, and the next request with that key is a `401`. Run it with the invalid example key and you get `404 key_not_found`, which is also what an already-revoked key returns. The sameness is deliberate, so nobody can use it to enumerate keys.

You can also pin a key to source networks with `allowed_cidrs` (IPv4 CIDR only), after which any other address gets `403` even with the right key. Be careful: setting it from a network that is not on the list locks out your own next request.

## Leak response checklist

1. **Revoke first.** Use the console, or the call above with the leaked key. It works before you have a replacement.
2. **Mint a replacement** with the scopes and cap the old one had, and deploy it.
3. **Hit several at once** if needed: `POST /openai/v1/keys/bulk` with `{"op":"revoke","ids":[...]}` takes up to 100 ids.
4. **Read the usage** for the window the key was exposed, using the account usage feed in [billing](/docs/billing).
5. **Find the leak.** Search your repository history, CI logs and chat transcripts, and remove the key from them.
6. **If you no longer hold any key**, the "Lost your API key" flow on the keys page revokes every key on the account and mints one replacement. It asks for an identity step-up first, and [authentication](/docs/authentication) lists which proofs it accepts.

## Keys never go in front-end code

Authenticated routes send no CORS headers, on purpose, and `OPTIONS` returns `405`. A browser on another origin cannot call them, so a key shipped in front-end code would fail and still be readable by anyone who opens your bundle. Keep the key on your server and proxy calls through it. Never put it in a `NEXT_PUBLIC_*` variable, a mobile app bundle or a public repository.

## Next steps

- Read [API keys](/docs/api-keys) for the cap fields, key groups and labels.
- Read [authentication](/docs/authentication) for the full scope table and the IP allowlist.
- Create a scoped key at [/settings/keys](/settings/keys).
- Follow [Building on the DiCompute API](/blog/building-on-the-dicompute-api) for the first request.
