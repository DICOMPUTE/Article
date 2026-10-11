---
title: "Pointing Claude Code, Codex CLI and OpenCode at open models"
description: "Terminal coding agents can use DiCompute's Anthropic and Responses lanes. The exact config, the traps, and the tool-calling caveat."
date: 2026-10-11
authors: [DiCompute team]
tags: [coding-agents, claude-code, codex-cli]
categories: [engineering]
cover: /blog-assets/blog/pointing-claude-code-at-open-models/banner.webp
coverAlt: "Duotone editorial illustration: ruled ledger lines crossed by small tally groups, one group picked out in accent; a cyan accent on a deep ink field."
---

AI coding agents in the terminal, such as Claude Code, Codex CLI and OpenCode, were among the most-adopted developer tools of 2026. All three let you point them at a different base URL, which means you can run them against an open model behind an OpenAI-compatible or Anthropic-compatible API. DiCompute exposes both shapes, plus the OpenAI Responses shape that Codex CLI wants.

This post gives the exact configuration for each tool, the traps that cost people an afternoon, and an honest caveat up front. A coding agent lives on tool calling: it edits files and runs commands by emitting tool calls. The protocol support for that is built, but the two catalogue models that carry the tools vouch are not accepting requests today, and the model that is accepting, `qwen2.5-3b-instruct`, is small, CPU-served and has a 1,024-token context window. These integrations are documented, not yet run, so treat everything below as configuration you still have to verify, not a promise that an agent will edit your files reliably.

## 1. Why terminal agents want a custom base URL

Each agent ships pointed at its vendor's API. Overriding the base URL, plus a key, is how you swap the backend without a plugin. DiCompute exposes three relevant routes under `https://dicompute.ai/openai`:

- `/openai/v1/chat/completions`, the OpenAI Chat Completions shape.
- `/openai/v1/responses`, the OpenAI Responses shape.
- `/openai/v1/messages`, the Anthropic Messages shape.

The [coding agents guide](/docs/coding-agents) has the per-tool configuration, and the [integrations pages](/integrations) give one command per client. Start by listing what's live, because model ids change:

```bash
curl -sS https://dicompute.ai/openai/v1/models \
  | jq '.data[] | {id, tools: .capabilities.tools, can_accept: .metadata.can_accept}'
```

## 2. Claude Code

Claude Code talks the Anthropic Messages API, and it has three details that a generic "set the base URL" note misses:

```bash
export ANTHROPIC_BASE_URL="https://dicompute.ai/openai"
export ANTHROPIC_AUTH_TOKEN="sk-dico-..."
export ANTHROPIC_MODEL="qwen2.5-3b-instruct"
export ANTHROPIC_DEFAULT_HAIKU_MODEL="qwen2.5-3b-instruct"
claude
```

- **No `/v1` on the base URL.** Claude Code appends `/v1/messages` itself. A base that already ends in `/openai/v1` composes a doubled path and fails with a `401` in the wrong protocol's error format.
- **`ANTHROPIC_AUTH_TOKEN`, not `ANTHROPIC_API_KEY`.** Claude Code sends the first as an `Authorization: Bearer` header and the second as `X-Api-Key`. Use the token variable.
- **Set the Haiku model too.** Claude Code makes background calls against `ANTHROPIC_DEFAULT_HAIKU_MODEL`, independently of your main model. Point it at a real catalogue id, or those calls fail.

The key value is a placeholder. Use your own key from [/settings/keys](/settings/keys), and keep it in your shell profile or secrets manager, not in a repo. The [Claude Code integration page](/integrations/claude-code) lists the same steps.

## 3. Codex CLI

Codex CLI's custom-provider path speaks the Responses API, so `wire_api = "responses"` is required. In `~/.codex/config.toml`:

```toml
[model_providers.dicompute]
name = "dicompute"
base_url = "https://dicompute.ai/openai/v1"
env_key = "DICO_API_KEY"
wire_api = "responses"
```

```bash
export DICO_API_KEY="sk-dico-..."
codex --provider dicompute --model qwen2.5-3b-instruct
```

The coding agents guide is explicit that this setting is required, because Codex's custom-provider path doesn't use Chat Completions. Codex's own shell and file tools are all function calling, so the tool-calling caveat below applies in full. The [Codex CLI integration page](/integrations/codex-cli) has the same setup.

## 4. OpenCode

OpenCode uses the `@ai-sdk/openai-compatible` provider. In `opencode.json`:

```json
{
  "provider": {
    "dicompute": {
      "npm": "@ai-sdk/openai-compatible",
      "options": { "baseURL": "https://dicompute.ai/openai/v1" },
      "models": { "qwen2.5-3b-instruct": {} }
    }
  }
}
```

Supply the key through an environment variable in the options block, or let OpenCode prompt for it with its login command. OpenCode's agent loop also expects tool calling, and it has not been run end to end against DiCompute.

## 5. The tool-calling reality

Two things get confused, so separate them:

- **Protocol support.** The API forwards `tools` and `tool_choice`, and the docs report that the Anthropic and Responses lanes round-trip a full tool-call loop in the API's own test suite. The wire format works.
- **Model vouch.** The catalogue's `capabilities.tools` flag is an operator's statement that a model's engine has been checked for tool calling. Today both models with `tools: true` also report `metadata.can_accept: false`, so no accepting model carries the vouch.

So a request carrying tools against `qwen2.5-3b-instruct` is not rejected, but nobody has checked that a small, quantized 3B model reliably decides to call a tool correctly. Don't expect agent file edits to work reliably on today's accepting models. Check `/openai/v1/models` and [/models](/models) before you plan around this, because it can change.

If an agent doesn't need tools, you're on firmer ground. Aider's default edit formats are plain-text over an ordinary chat completion, which is why the coding agents guide calls it the safest starting point.

## 6. Test a tool call with curl first

Before you trust an agent, send one tool-bearing request yourself:

```bash
curl -sS https://dicompute.ai/openai/v1/chat/completions \
  -H "authorization: Bearer $DICO_KEY" \
  -H 'content-type: application/json' \
  -d '{"model":"qwen2.5-3b-instruct","max_tokens":64,
       "messages":[{"role":"user","content":"What is the weather in SF? Use the tool."}],
       "tools":[{"type":"function","function":{"name":"get_weather",
         "parameters":{"type":"object","properties":{"city":{"type":"string"}}}}}]}'
```

With a good key, `finish_reason: "tool_calls"` and a well-formed `tool_calls` array mean it worked for that prompt. Plain text back means the model ignored the tool, which is a normal `200`, not an error. To check your setup without a real key, send the same request with `sk-dico-invalid-example` and you should get a `401` with `"code":"invalid_api_key"`.

## 7. Single-use setup links from /connect

If you'd rather not copy config by hand, [/connect](/connect) creates a single-use setup link for a coding client. The link expires after 15 minutes and contains no key. The script reads your key from your environment, never from an argument, so you still create the key separately. Per-client steps are at [/connect.md](/connect.md).

## Where to go from here

- [Coding agents](/docs/coding-agents): every tool's configuration, including Aider, Cursor and Cline.
- [Claude Code](/integrations/claude-code) and [Codex CLI](/integrations/codex-cli): the per-client pages.
- [/connect](/connect): single-use setup links.
- [Building on the DiCompute API](/blog/building-on-the-dicompute-api): keys, models, rate limits and errors.
