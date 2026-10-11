---
title: "Streaming responses into a web UI"
description: "Build a token-by-token chat UI on DiCompute: SSE on the server, a proxy for the browser, and handling the end of the stream."
date: 2026-10-11
authors: [DiCompute team]
tags: [streaming, frontend, vercel-ai-sdk]
categories: [engineering]
cover: /blog-assets/blog/streaming-responses-into-a-web-ui/banner.webp
coverAlt: "Duotone editorial illustration: ruled ledger lines crossed by small tally groups, one group picked out in accent; a cyan accent on a deep ink field."
---

Streaming-first AI interfaces became the expected UX standard in 2026. Users expect words to appear as the model produces them, not a spinner followed by a wall of text. DiCompute's chat completions endpoint streams over server-sent events (SSE), so building that interface is mostly a matter of plumbing.

This post is for developers building a browser chat UI. It covers the raw stream, why the browser must never call the API directly, a minimal proxy, the Vercel AI SDK alternative, and what happens when a stream breaks. One honest note first: the examples use `qwen2.5-3b-instruct`, the model that accepts requests through the direct engine today. It is small and its context window is 1,024 tokens, so keep prompts short and set a low `max_tokens`. This post makes no promise about response speed. Measure your own.

## 1. Why streaming matters

A non-streamed request returns nothing until the whole answer exists. A streamed one starts delivering as soon as the first tokens are ready, so the user sees progress while the rest is still being generated. The [error reference](/api-console/errors) also notes a practical benefit: a stream starts delivering before the whole answer exists, so it is less exposed to the total-deadline timeout than a long non-streamed request.

## 2. The raw stream

Add `"stream": true` to a chat completions request and the response becomes SSE:

```bash
curl -sS -N https://dicompute.ai/openai/v1/chat/completions \
  -H "authorization: Bearer $DICO_KEY" \
  -H 'content-type: application/json' \
  -d '{"model":"qwen2.5-3b-instruct","messages":[{"role":"user","content":"say OK"}],"max_tokens":16,"stream":true}'
```

Use `-N` so curl doesn't buffer. The body is a series of `data:` frames separated by blank lines:

- Content frames are OpenAI chat-completion chunks. The text is in `choices[0].delta.content`.
- The usage numbers arrive on the terminal frame, just before the end. Guard for chunks with an empty or missing `choices` array, as the [API guide](/blog/building-on-the-dicompute-api) does, so the usage chunk can't break your loop.
- The stream ends with `data: [DONE]`.

If the engine's connection dies after the stream has started, the `200` and its headers have already been sent, so the failure arrives in-band: a `data:` frame with `error.code: "upstream_connection_reset"`, followed by exactly one `[DONE]`. Treat any `error` frame as terminal.

## 3. Never call the API from the browser

Authenticated routes send no CORS headers, and a preflight `OPTIONS` returns `405`. That's deliberate. A browser can't call the API cross-origin, and even if it could, shipping your `sk-dico-` key to a page would hand it to every visitor. Your server holds the key. The browser talks to your server. Only the public feeds, like `/openai/v1/models`, allow cross-origin `GET`.

## 4. A minimal proxy that relays the stream

This Node server accepts `{ "prompt": "..." }` from your own page, calls DiCompute with the key from its environment, and relays the bytes untouched:

```js
import http from "node:http";

const UPSTREAM = "https://dicompute.ai/openai/v1/chat/completions";

const server = http.createServer(async (req, res) => {
  if (req.method !== "POST" || req.url !== "/api/chat") {
    res.writeHead(404).end();
    return;
  }

  let raw = "";
  for await (const part of req) raw += part;
  const { prompt } = JSON.parse(raw);

  const abort = new AbortController();
  res.on("close", () => abort.abort()); // browser went away: stop reading upstream

  const upstream = await fetch(UPSTREAM, {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.DICO_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "qwen2.5-3b-instruct",
      messages: [{ role: "user", content: String(prompt).slice(0, 2000) }],
      max_tokens: 128,
      stream: true,
    }),
    signal: abort.signal,
  });

  console.log("upstream", upstream.status, upstream.headers.get("x-request-id"));

  res.writeHead(upstream.status, {
    "content-type": upstream.headers.get("content-type") ?? "application/json",
    "cache-control": "no-store",
  });
  try {
    for await (const chunk of upstream.body) res.write(chunk);
  } catch {
    // aborted by the client; nothing left to relay
  }
  res.end();
});

server.listen(3000);
```

The model, the key and `max_tokens` all live on the server, so a visitor can't change them. The proxy also relays the upstream status, so a `401` or `429` reaches your UI as itself. Add your own authentication and rate limiting in front of it, since this endpoint spends your balance.

In the browser, read the stream and append tokens:

```js
async function streamChat(prompt, onToken) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok || !res.body) throw new Error(`chat failed: ${res.status}`);

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    const frames = buffer.split("\n\n");
    buffer = frames.pop(); // keep a partial frame for the next read
    for (const frame of frames) {
      if (!frame.startsWith("data:")) continue; // e.g. a ": keepalive" comment
      const data = frame.replace(/^data: ?/, "");
      if (data === "[DONE]") return;
      const json = JSON.parse(data);
      if (json.error) throw new Error(json.error.code ?? "stream error");
      const token = json.choices?.[0]?.delta?.content;
      if (token) onToken(token);
    }
  }
}
```

Frames can split across reads, which is why the buffer keeps the unfinished tail. During a long pause between tokens the API can also send an SSE comment line, `: keepalive`, to hold the connection open. It carries no data, so the loop skips any frame that doesn't start with `data:`.

## 5. The Vercel AI SDK

If you'd rather not parse SSE yourself, the [frameworks guide](/docs/frameworks) shows the `@ai-sdk/openai-compatible` provider. Swap `generateText` for `streamText` on the server:

```js
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { streamText } from "ai";

const dicompute = createOpenAICompatible({
  name: "dicompute",
  baseURL: "https://dicompute.ai/openai/v1",
  apiKey: process.env.DICO_KEY,
});

const result = streamText({
  model: dicompute("qwen2.5-3b-instruct"),
  prompt: "say OK",
  maxOutputTokens: 64,
});

for await (const part of result.textStream) process.stdout.write(part);
```

In a route handler, return `result.toTextStreamResponse()` and read it in the browser. The key still stays on the server. The [Vercel AI SDK integration page](/integrations/vercel-ai-sdk) has the per-client details. Like every integration, it is documented, not yet run end to end.

## 6. Disconnects, partial replies and cost

The billing rule is simple. A request is charged for the tokens it actually delivered. A failure before the first output byte is refunded in full. A stream that dies after it has emitted tokens, whether from a dropped connection, a cancelled request or an engine failure, settles for the tokens you received, floored at the $0.0001 per-request minimum. So the Stop button in your UI costs the tokens already sent, and the abort handler in the proxy above is what makes it stop.

There is no resuming a partial stream. A re-issue is a new request: it regenerates from scratch and is charged again for what it delivers, including the prompt. `Idempotency-Key` is refused on streaming requests with a `422`. Keep the partial text on screen, mark it incomplete, and let the user choose to retry.

## 7. Log `x-request-id`

Every response carries `x-request-id: req_<uuid>`, and the proxy above logs it for each stream. Do that from day one. It's the first thing needed to look up a request later in the account usage endpoint, or to ask about it.

## Next steps

- [Connecting an app framework](/docs/frameworks): the Vercel AI SDK, LangChain, LlamaIndex and raw `fetch`.
- [Vercel AI SDK integration](/integrations/vercel-ai-sdk): the per-client page.
- [Errors](/api-console/errors): in-stream error frames, retry advice and billing effect.
- [Building on the DiCompute API](/blog/building-on-the-dicompute-api): keys, models and rate limits.
