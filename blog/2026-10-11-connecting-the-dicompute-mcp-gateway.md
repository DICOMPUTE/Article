---
title: "Connecting the DiCompute MCP gateway to your tools"
description: "One endpoint, one key: add the DiCompute MCP gateway to Claude Code, Cursor or Claude Desktop, and how its auth works."
date: 2026-10-11
authors: [DiCompute team]
tags: [mcp, coding-agents, integrations]
categories: [engineering]
cover: /blog-assets/blog/connecting-the-dicompute-mcp-gateway/banner.webp
coverAlt: "Duotone editorial illustration: ruled ledger lines crossed by small tally groups, one group picked out in accent; a cyan accent on a deep ink field."
---

The Model Context Protocol (MCP) became the default way to plug tools into AI clients over 2025 and 2026. DiCompute runs an MCP gateway: one HTTPS endpoint that exposes the MCP servers you installed in the DiCompute console as tools, to any client that speaks MCP over HTTP. This post shows the exact commands and config for Claude Code, Cursor and Claude Desktop, and explains how the endpoint's authentication behaves so you can debug it.

Read the status first. The three client integrations are labelled "Documented, not yet run" on their pages. The endpoint itself answers correctly (the 401 challenge below is real and you can reproduce it), but nobody has yet run a full `tools/list` round trip from a live client with a real key. The public MCP catalogue, `GET /openai/v1/mcp-catalog`, currently returns zero entries. Treat this guide as the documented wiring, not as a proven workflow.

## What MCP is, and why a gateway helps

MCP is a small JSON-RPC protocol. A client asks a server which tools it offers (`tools/list`) and then calls them (`tools/call`). Without a gateway, each MCP server you use is a separate process or URL, each with its own credentials, and every client you own needs its own copy of that list.

A gateway turns that into one URL and one key. You install MCP servers once, in DiCompute. Every client you point at the gateway sees the same tools. Rotate the key in one place and every client has to follow, which is also the argument for giving each client its own key (see [API keys](/docs/api-keys) for how).

## The endpoint and auth

```
POST https://dicompute.ai/openai/v1/mcp
Authorization: Bearer sk-dico-...
```

Four rules, all from [authentication](/docs/authentication):

- **Use a raw `sk-dico-` API key.** Create one at [/settings/keys](/settings/keys).
- **The scope you need is `inference`.** That is the default for a key minted from Settings or from `POST /openai/v1/keys` with no `scopes` array. No key-management or storage scope is involved, so an MCP client does not need a powerful key.
- **A browser session token is refused.** A `dico-sess-` token gets `403 session_cannot_use_mcp`. If you copied a token out of your browser, mint a key instead.
- **The endpoint is bound to your account's installed servers.** What the client sees is whatever you installed in the console, nothing more.

## Claude Code

One command, from [the Claude Code (MCP) integration page](/integrations/mcp-claude-code):

```bash
export DICO_API_KEY="sk-dico-..."   # your key; never commit it
claude mcp add --transport http dicompute https://dicompute.ai/openai/v1/mcp \
  --header "Authorization: Bearer $DICO_API_KEY"
```

Your shell expands the variable, so the key appears in that one command's arguments. Run it from a shell you trust, or add the entry to Claude Code's MCP config file by hand to keep the key out of your shell history. `claude mcp list` shows whether the server connected.

This is separate from pointing Claude Code's own model traffic at DiCompute, which uses different environment variables. [Coding agents](/docs/coding-agents) covers that.

## Cursor and Claude Desktop

Cursor reads remote MCP servers from `~/.cursor/mcp.json`, or `.cursor/mcp.json` inside a project. Export `DICO_API_KEY` before Cursor starts and reference it from the file ([Cursor integration](/integrations/mcp-cursor)):

```json
{
  "mcpServers": {
    "dicompute": {
      "url": "https://dicompute.ai/openai/v1/mcp",
      "headers": { "Authorization": "Bearer ${env:DICO_API_KEY}" }
    }
  }
}
```

Claude Desktop starts local servers, so a remote HTTP endpoint goes through the `mcp-remote` bridge. Put the key in the `env` block, not in `args`, so it stays out of the process list. Add this to `claude_desktop_config.json` and restart the app ([Claude Desktop integration](/integrations/mcp-claude-desktop)):

```json
{
  "mcpServers": {
    "dicompute": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://dicompute.ai/openai/v1/mcp", "--header", "Authorization:${DICO_AUTH}"],
      "env": { "DICO_AUTH": "Bearer sk-dico-..." }
    }
  }
}
```

## What a 401 tells you

You can check the endpoint without a client. These two calls need no real key:

```bash
curl -sS -i -X POST https://dicompute.ai/openai/v1/mcp \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

curl -sS -i -X POST https://dicompute.ai/openai/v1/mcp \
  -H 'authorization: Bearer sk-dico-invalid-example' \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Both return `401` with the usual body, `{"error":{"message":"invalid api key", ...,"code":"invalid_api_key"}}`. The header is the interesting part:

```
www-authenticate: Bearer realm="DiCompute", resource_metadata="https://dicompute.ai/.well-known/oauth-protected-resource/openai/v1/mcp"
```

With no key at all, that is the whole challenge. With a bad key, it adds `error="invalid_token"`. The `resource_metadata` URL follows RFC 9728 (OAuth protected resource metadata). A client that understands it can fetch that document, which names the resource (`https://dicompute.ai/openai/v1/mcp`), its authorization server and the scopes it knows about. You do not need to follow it by hand. It is why an MCP client can tell "this endpoint wants a bearer token" from "this endpoint is down".

A quick reading guide:

| You see | Likely cause |
|---|---|
| `401`, no `error=` in the header | No `Authorization` header reached the server. Check the variable expanded. |
| `401`, `error="invalid_token"` | A header arrived, but the key is wrong, revoked or mistyped. |
| `403 session_cannot_use_mcp` | You sent a browser session token instead of an `sk-dico-` key. |
| An empty tool list | The key is fine and no MCP server is installed on the account. |

## Tools are named `<server>__<tool>`

The gateway lists the tools of every server you installed, and prefixes each tool with its server name and a double underscore. A tool called `search` on a server you named `docs` arrives as `docs__search`. The prefix keeps two servers' tools apart when they share a tool name. If you write your own client or an allow-list, match on the full prefixed name.

## What is and isn't true today

- The endpoint's auth contract was checked by hand against the live service on 2026-10-09, according to the integration pages. The pages say a full connection from a real client with a valid key has not been run yet.
- The public catalogue of installable servers is empty today. Check `GET https://dicompute.ai/openai/v1/mcp-catalog` rather than assuming an entry exists.
- Tool calls made by a *model* through DiCompute are a separate question. The two models that carry the tool-calling flag are not accepting requests today, so do not build an agent loop on this gateway yet. [Coding agents](/docs/coding-agents) explains the `capabilities.tools` flag.

## Next steps

- Read the three integration pages: [Claude Code](/integrations/mcp-claude-code), [Cursor](/integrations/mcp-cursor) and [Claude Desktop](/integrations/mcp-claude-desktop).
- Read [authentication](/docs/authentication) for scopes, and how to bind a key to one named MCP endpoint.
- Create a dedicated key for each client at [/settings/keys](/settings/keys).
- Start from [Building on the DiCompute API](/blog/building-on-the-dicompute-api) if you have not made a first request yet.
