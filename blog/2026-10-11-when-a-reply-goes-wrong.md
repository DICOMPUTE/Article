---
title: "When an AI reply goes wrong: a troubleshooting guide"
description: "Cut-off replies, refusals, slow answers and errors: what each means on DiCompute, what it costs you, and what to do next."
date: 2026-10-11
authors: [DiCompute team]
tags: [help, troubleshooting, console]
categories: [product]
cover: /blog-assets/blog/when-a-reply-goes-wrong/banner.webp
coverAlt: "Duotone editorial illustration: a tilted orbit ring around a solid point, with a second point travelling the ring, picked out in accent; an amber accent on a deep ink field."
---

As people lean on AI every day in 2026, a failed reply gets noticed fast. The hard part is usually working out whose fault it is: yours, the model's, or the service's. The fix is different for each.

This guide maps the common failures in the [DiCompute console](/console) to plain causes, says what each one costs you, and tells you what to try next. It can't promise that nothing will go wrong. It does say plainly what happens when something does.

## Interrupted replies: the Retry button, and no extra charge

Sometimes a reply stops partway because the server restarted or crashed while it was streaming. The [chat guide](/docs/chat) describes what happens next:

- Within about a minute, the chat marks the reply as interrupted and shows a **Retry** button.
- If some of the answer had already arrived, that text stays visible, next to the Retry message. It is there for you to read. The model doesn't treat it as an answer on the next turn.
- You pay for what the turn had already settled, and settling an interrupted reply never adds a charge.

So pressing Retry is safe. On billing in general, the docs set out a rule: a request refused before it starts costs nothing, a failure before the first word is refunded in full, and a reply that breaks off after some words settles for the words you received, with a small minimum charge. The [error reference](/api-console/errors) lists every condition and its billing effect.

## The model ignored my request

If a reply is off-topic, forgets what you said earlier, or answers only part of your question, the cause is often the **context window**. That is how much text, counting your message and the whole chat so far, the model can take in at once. Once a chat is longer than the window, the model can't see the earliest parts.

Windows differ a lot between models. According to `/openai/v1/models`, the model that accepts requests directly today, `qwen2.5-3b-instruct`, has a window of only 1,024 tokens, which is not much. A token is roughly a short word or part of one. The window sizes can change, so check the current figure on [/models](/models).

Fixes to try, in order:

1. **Start a new chat** for a new topic, instead of carrying a long history.
2. **Shorten your message.** Paste only the part that matters.
3. **Ask one thing at a time.** Several questions in one message often get partial answers.
4. **Be specific.** Say what format you want, such as "three bullet points".
5. **Pick a model with a larger window**, if it is accepting requests.

The [token counter](/tools/token-counter) and [context check](/tools/context-check) tools run in your browser, and the text you type never leaves the page.

Also keep in mind that small models make mistakes and sometimes miss instructions even when everything fits. If one rewording doesn't help, try a different model.

## A model isn't accepting requests

Every model in the catalogue is listed on [/models](/models), but being listed doesn't mean it is taking requests right now. The public feed at `/openai/v1/models` carries a `metadata.can_accept` flag for each model. At the time of writing, two of the five listed models read false, and that can change at any time.

If a model fails every time, check that page and the feed, then pick another model that is accepting. Don't keep retrying a model that has been marked as not accepting.

## Is it down? Reading /status

[/status](/status) shows whether the service is healthy right now. It reports the state of the service, its storage and its models, and says so in words when things are degraded. It also shows per-model reliability.

How to read it:

- If a model is marked degraded, that is a hint that its failures aren't your fault. Try another model, or wait.
- If everything reads healthy and one chat still fails, the cause is more likely in the chat itself: its length, your message or your balance.

DiCompute has no contractual SLA, and we don't quote an uptime figure here. The status page is the live source.

## Out of credit and spend limits

If replies are refused because your balance is empty, or you've hit a spend limit you set yourself, topping up or raising the limit is the fix. Retrying won't help, and it shouldn't be retried on a timer.

- Add credit under Settings → Billing → **Add credit**. It opens a Stripe checkout.
- Check the limits you may have set. Spend limits, auto-reload and alerts are part of the self-serve plan, per the [pricing page](/pricing).
- If you belong to an organization, there may be a per-member cap set by its owner.

The [billing guide](/docs/billing) explains how requests are reserved and settled.

## Asking for help: /help and what to include

If none of this solves it, go to [/help](/help). It points to the page that answers each common question and to the docs. When you ask, include details that let someone find your case:

- What you were doing and what you expected.
- The model name you picked.
- The time it happened, with your time zone.
- The exact wording of any error message, but not your passwords or keys.
- If you use the API, the `x-request-id` header from the response. Every response carries one, and it is the reference for looking up a request.

## Where to go from here

- Try the console's Retry button the next time a reply is interrupted, now that you know it is safe: [/console](/console).
- Read the [chat guide](/docs/chat) for rewind, branch and archive.
- Look at [/models](/models) for context windows, and at `metadata.can_accept` in `/openai/v1/models` for whether a model is accepting requests.
- Bookmark [/status](/status) and [/help](/help).
- For the basics, see [Using DiCompute day to day](/blog/using-dicompute-day-to-day).
