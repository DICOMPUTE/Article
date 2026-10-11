---
title: "Verifying DiCompute webhooks"
description: "Every delivery is HMAC-signed. Check the signature, reject replays, de-duplicate by event id, and rotate secrets without downtime."
date: 2026-10-11
authors: [DiCompute team]
tags: [webhooks, security, api]
categories: [engineering]
cover: /blog-assets/blog/verifying-dicompute-webhooks/banner.webp
coverAlt: "Duotone editorial illustration: ruled ledger lines crossed by small tally groups, one group picked out in accent; a cyan accent on a deep ink field."
---

Webhook signature checks stayed on API-security checklists through 2026 because the failure is easy to ship: a receiver that trusts every POST that claims to come from a vendor. DiCompute signs every delivery. This post shows how to check the signature in Node and Python, reject stale and repeated deliveries, handle the two-signature header during secret rotation, and fall back to the events feed when your receiver was down.

Every code sample here follows the wire format on [the webhook signatures page](/docs/webhooks) and the [API console's webhook reference](/api-console/webhooks). The two verifiers below were run against the fixture that console page publishes (a documentation secret, not a real one) and return the expected results. We have not received a live delivery, because that needs a key and a public HTTPS endpoint.

## Why an unsigned endpoint is a public write surface

Your webhook URL is a public address. Anyone who finds it can POST a body that says "credit added" or "key revoked". If your handler acts on the body without checking who sent it, they control your handler. The signature is the only thing tying a request to DiCompute. The secret is shown once, when you register the endpoint, so store it then.

## The headers

Every delivery carries three:

| Header | Value |
|---|---|
| `x-dico-signature` | `t=<unix seconds>,v1=<hex hmac>` |
| `x-dico-timestamp` | The same `t`, repeated for convenience |
| `x-dico-event-id` | This event's id, stable across every retry |

The shape deliberately mirrors Stripe's, so code you already wrote for that scheme ports with a different header name and secret.

## Computing HMAC-SHA256 over `timestamp.rawBody`

The signature is the hex HMAC-SHA256, keyed with your endpoint secret, of the string `<t>.<rawBody>`: the timestamp, a literal dot, then the exact bytes of the request body. In Node:

```js
import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyDicoWebhook(secret, header, rawBody, toleranceSeconds = 300) {
  const t = Number(/(?:^|,)t=(\d+)/.exec(header)?.[1]);
  if (!Number.isFinite(t)) return false;
  if (Math.abs(Date.now() / 1000 - t) > toleranceSeconds) return false;

  const expected = createHmac("sha256", secret)
    .update(`${t}.`)
    .update(rawBody) // a Buffer or string, exactly as received
    .digest();

  // During a secret rotation the header carries two v1= values. Accept either.
  return [...header.matchAll(/v1=([0-9a-f]+)/g)].some(([, hex]) => {
    const got = Buffer.from(hex, "hex");
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}
```

And in Python:

```python
import hashlib
import hmac
import re
import time


def verify_dico_webhook(secret: str, header: str, raw_body: bytes, tolerance_seconds: float = 300) -> bool:
    m = re.search(r"(?:^|,)t=(\d+)", header)
    if not m:
        return False
    t = int(m.group(1))
    if abs(time.time() - t) > tolerance_seconds:
        return False

    expected = hmac.new(secret.encode(), f"{t}.".encode() + raw_body, hashlib.sha256).hexdigest()
    return any(hmac.compare_digest(c, expected) for c in re.findall(r"v1=([0-9a-f]+)", header))
```

Two rules are not optional. Compare in constant time (`timingSafeEqual`, `hmac.compare_digest`), never with `===` or `==`, because an early-exit comparison leaks how much of a guess was right through response timing. And check every `v1=` value, not just the first.

## Raw-body pitfalls

The signature covers the bytes on the wire. If your framework parses the JSON and you re-serialize it, key order, spacing or Unicode escapes can differ, and every genuine delivery will look forged. Capture the raw bytes before parsing:

```js
import express from "express";

const app = express();

app.post("/webhooks/dicompute", express.raw({ type: "application/json" }), (req, res) => {
  const ok = verifyDicoWebhook(process.env.DICO_WEBHOOK_SECRET, req.header("x-dico-signature") ?? "", req.body);
  if (!ok) return res.status(401).end();
  const event = JSON.parse(req.body.toString("utf8")); // parse only after the check passes
  // ...hand off to a queue, then acknowledge quickly
  res.status(200).end();
});
```

In Flask, use `request.get_data()` for the raw bytes. In any framework, watch for middleware that parses the body before your handler runs, and register the webhook route ahead of a global JSON parser.

## Replay protection and de-duplication

Two separate defenses, because they stop different things.

**Timestamp tolerance** stops an attacker replaying a captured, genuinely signed request later. DiCompute does not enforce a window on your behalf: `t` is there so your receiver can. Five minutes is a reasonable starting value, borrowed from Stripe's default, not a DiCompute-defined number. Reject stale deliveries the way you reject a bad signature.

**De-duplication** handles the legitimate repeats. A failed attempt is retried against the same event, so you will see the same `x-dico-event-id` more than once. Store the ids you have processed, and skip repeats:

```python
def handle(event_id: str, event: dict, db) -> None:
    # `event_id` has a UNIQUE constraint; the insert fails on a repeat delivery.
    if not db.try_insert_event_id(event_id):
        return  # already processed, acknowledge with 200 and do nothing
    process(event)
```

Make the insert and the work atomic if you can, or make the work idempotent. Retries back off from about 30 seconds, doubling, and after 5 consecutive failures the endpoint is automatically disabled until you call its `reenable` route. The console page says those numbers are operator-tunable, so treat them as typical, not guaranteed. Respond `2xx` fast and do slow work afterward.

## Test deliveries, redelivery and secret rotation

All management routes need a key with `billing:read` or `billing:write`. A default key has `inference` only, so mint a narrowly scoped one for this ([scoped API keys](/docs/api-keys)). Routes under `https://dicompute.ai/openai/v1`:

- `POST /webhook-endpoints` registers an endpoint: `{"url":"https://example.com/hook","event_types":["credit.added"]}`. The URL must be public HTTPS, and you can have 10 endpoints per account. Omit `event_types` to subscribe to everything.
- `POST /webhook-endpoints/{id}/test` sends a synthetic `webhook.test` event through the real signing path. It is never stored, so repeated tests cannot disable the endpoint. It is limited to 10 calls a minute.
- `GET /webhook-endpoints/{id}/deliveries` lists past attempts, and `POST .../deliveries/{eventId}/redeliver` resends one, signed exactly like the original.
- `POST /webhook-endpoints/{id}/rotate-secret` mints a new secret. The old one keeps signing for a fixed 24 hours, and during that window the header carries two `v1=` values. Update your stored secret at any point in the window and every delivery still verifies, as long as your code accepts either value.

Subscribe only to event types from the closed catalogue on the [console page](/api-console/webhooks), such as `credit.added`, `key.revoked` or `batch.completed`. To check your registration call shape without a real key, send it with `sk-dico-invalid-example` and expect the standard `401` body.

## The events feed as a fallback

Push can fail: your receiver was down, or the endpoint was auto-disabled. The same events are available by polling. `GET /openai/v1/events` returns your account's activity in the same vocabulary, with `?after=<id>` as a forward cursor and `?limit=` clamped by the server. It needs `billing:read` or `billing:write` and keeps events for 90 days. A cursor older than that is refused with a distinct `cursor_before_retention` error, so persist your last id and catch up after an outage rather than starting over.

## Next steps

- Read [Verifying webhook signatures](/docs/webhooks) for the Agent run events payloads.
- Keep the [webhook reference](/api-console/webhooks) open for the event catalogue.
- Create a narrowly scoped key at [/settings/keys](/settings/keys) for managing endpoints.
- Start with [Building on the DiCompute API](/blog/building-on-the-dicompute-api) if you are new to the API.
