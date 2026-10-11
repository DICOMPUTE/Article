---
title: "Tracing LLM requests with OTLP span export"
description: "Pull a request's own spans as OTLP JSON, correlate them with x-request-id, and add LLM calls to your existing observability stack."
date: 2026-10-11
authors: [DiCompute team]
tags: [observability, opentelemetry, api]
categories: [engineering]
cover: /blog-assets/blog/tracing-requests-with-otlp-span-export/banner.webp
coverAlt: "Duotone editorial illustration: ruled ledger lines crossed by small tally groups, one group picked out in accent; a cyan accent on a deep ink field."
---

OpenTelemetry's generative-AI conventions and LLM observability tooling matured quickly in 2026. The idea is simple: a call to a model is a dependency like a database or a payment API, so it belongs in the same traces as the rest of your request. DiCompute has a feature for this, and this post shows how to use it and where it stops.

It is for developers who already run an OpenTelemetry collector or a tracing backend. Here is the honest scope first. The feature is a pull: for a request whose id you already have, you can fetch that request's spans as OTLP JSON and forward them to your collector yourself. This post describes only that pull route. It captures no prompt or response text. And it is not a stream of every request: you have to ask for each one.

## 1. Why LLM calls need tracing

When a user says "the answer was slow", your own trace shows a long span waiting on an HTTP call and nothing inside it. Was it queueing, the first token, or the whole answer? A request's spans answer that from the platform's side, using the same numbers the usage endpoint reports. Joined to your own trace, they turn a black box into a few labeled steps.

## 2. Check the capability first

The feature is gated by a public flag. Check it instead of assuming:

```bash
curl -sS https://dicompute.ai/openai/v1/capabilities | jq '.capabilities.otel_span_export'
```

At the time of writing, `configured` is `true`. If an operator has turned the export off, the route answers `501` with `error.code: "otel_export_unavailable"`. Treat that as "no tracing right now", not as an outage. Note that `request_trace_capture`, the opt-in storage of prompts and responses, is a separate capability and is off. The span export has no field for prompt or completion text at all.

## 3. Capture `x-request-id` on every response

The pull route is keyed on the request id. Every response, success or error, carries `x-request-id: req_<uuid>`, so record it next to your own trace id the moment the call returns. With the `openai` package:

```python
raw = client.chat.completions.with_raw_response.create(
    model="qwen2.5-3b-instruct",
    messages=[{"role": "user", "content": "say OK"}],
    max_tokens=16,
)
request_id = raw.headers["x-request-id"]
completion = raw.parse()
```

Also attach it to a span attribute or a structured log line. If you only log it on errors, you'll be missing it for the slow successes you most want to look at.

## 4. Fetch the spans

```bash
curl -sS "https://dicompute.ai/openai/v1/account/usage/requests/$REQUEST_ID/otlp" \
  -H "authorization: Bearer $DICO_KEY"
```

The response is an OTLP/HTTP JSON `ExportTraceServiceRequest`. The [billing docs](/docs/billing) describe it as the same reconstruction as the plain request-lookup route, reshaped: one span per dispatch attempt, with the model, final status, token counts and time to first token as span attributes. They are the same numbers the plain route returns, not a second derived copy. The [usage and limits page](/docs/usage-and-limits) lists the neighbouring introspection routes.

Some rules to know:

- It needs your API key, and it is scoped to your account. Another account's request id, or an unknown one, returns the same `404`.
- It never includes a worker's identity or any prompt or completion content.
- It answers for requests you still have the id for. It is not a "list my past requests" route. For that, use the usage endpoints.

Try it with `sk-dico-invalid-example` to check your wiring. You should get the standard `401` with `"code":"invalid_api_key"`.

## 5. Forward the JSON to a collector

The payload is already in OTLP format, so you can post it straight to any OTLP/HTTP traces endpoint. Typically that's an OpenTelemetry Collector you run, which then fans out to the backend you use. In Python:

```python
import httpx

BASE = "https://dicompute.ai/openai/v1"
COLLECTOR = "http://localhost:4318/v1/traces"   # your collector's OTLP/HTTP traces URL


def forward_spans(http: httpx.Client, key: str, request_id: str) -> int:
    r = http.get(
        f"{BASE}/account/usage/requests/{request_id}/otlp",
        headers={"authorization": f"Bearer {key}"},
        timeout=10,
    )
    r.raise_for_status()  # 404: unknown id or not your request; 501: export is off
    out = http.post(
        COLLECTOR,
        content=r.content,
        headers={"content-type": "application/json"},
        timeout=10,
    )
    return out.status_code
```

The docs show the same thing as a shell pipeline: fetch with one `curl`, then `POST` the output to your collector with `content-type: application/json`. Where you call this from is up to you. A small job that handles slow or failed requests is a good start, since those are the ones worth looking at. Because it's a pull, you decide the sampling. Forwarding every request doubles your calls, so do it selectively.

## 6. Join the spans with your own traces

When your original request carries a W3C `traceparent` header, the exported spans are joined to that trace. So send one. If you use the OpenTelemetry SDK, its propagator injects the header for you. Done by hand, it looks like this:

```python
import secrets

trace_id = secrets.token_hex(16)        # normally taken from your current span
parent_span_id = secrets.token_hex(8)

r = httpx.post(
    f"{BASE}/chat/completions",
    headers={
        "authorization": f"Bearer {key}",
        "traceparent": f"00-{trace_id}-{parent_span_id}-01",
    },
    json={
        "model": "qwen2.5-3b-instruct",
        "messages": [{"role": "user", "content": "say OK"}],
        "max_tokens": 16,
    },
    timeout=30,
)
request_id = r.headers["x-request-id"]
```

Then forward the spans with the function above and look the trace up in your backend. The docs say the exported spans are joined to your inbound `traceparent`, so they should appear in that trace. Check one in your own backend to see how it nests. If you didn't send a `traceparent`, the spans still export, but you'll correlate them by request id instead.

## 7. What it's for, and its limits

Use it for latency and failure analysis on individual requests: how many attempts a request made, which one failed, how long the first token took, how many tokens it used. Keep these limits in mind:

- **Pull only.** You fetch per request id. This post doesn't describe any automatic delivery of spans to a destination you configure, and you shouldn't build on one.
- **Metadata only.** There's no prompt or response text anywhere in the payload.
- **No worker identity.** You see attempts and their outcomes, not which machine served them.
- **Only as available as the flag.** Check `otel_span_export` in the capabilities feed, and handle the `501`.

For the dashboard view, the usage endpoints give you spend and request history, and the [API reference](/api-console) lists them all. For a request that went wrong, the [error reference](/api-console/errors) explains what each failure means and whether it was billed.

## Next steps

- [Billing](/docs/billing): reconstructing a request, and the OTLP route.
- [Usage and limits](/docs/usage-and-limits): the introspection routes that answer "what happened to my spend".
- [API reference](/api-console): the interactive reference.
- [Building on the DiCompute API](/blog/building-on-the-dicompute-api): where `x-request-id` fits into the basic integration.
