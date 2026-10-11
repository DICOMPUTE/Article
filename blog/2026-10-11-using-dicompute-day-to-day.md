---
title: "Using DiCompute day to day"
description: "A plain-language guide for people who are not developers: how to sign in, chat with an open model in the console, pick a model, get everyday tasks done and add credit."
date: 2026-10-11
authors: [DiCompute team]
tags: [guides, console, chat]
categories: [product]
cover: /blog/using-dicompute-day-to-day/opengraph-image
---

You don't need to write code to use DiCompute. The console is a chat window
in your browser. You type a question or a task, an open AI model replies, and
your account pays only for the words that model reads and writes. This guide
walks through a normal day of using it, and says plainly what it can't do yet.

## Signing in

Open [dicompute.ai/login](/login) and pick one of the sign-in buttons on the
page; the options include Google, GitHub, X and Telegram. Your account is created
the first time you sign in, so there is no separate sign-up form and no
password to remember.

Once you're in, [the console](/console) opens on a new chat.

## Your first chat

Type into the message box at the bottom and press Enter. The reply streams in
as the model writes it. A few things worth knowing:

- **Your chats follow you.** When you're signed in, your conversations are
  saved to your account. They appear in the sidebar and at [/chats](/chats),
  on any device you sign in on. The one thing that stays only in your browser
  is a message you've typed but not sent yet.
- **Simple and Pro.** The sidebar starts in Simple mode: New chat, Search,
  Projects, Library and your recent chats. If you want every page the console
  has, switch to Pro with the Mode switch at the bottom of the sidebar, or in
  Settings → Appearance.
- **Tidying up.** From [/chats](/chats) you can rename, pin, archive or delete
  a conversation, or several at once. You can also export a chat as Markdown or
  JSON from its own ... menu.

The [chat guide](/docs/chat) covers all of this in more detail.

## Picking a model

The message box has a model menu. Each model is a different open AI model,
with its own price and its own limits. The full list, with live prices, is on
[/models](/models) and [/pricing](/pricing). Both pages read the catalogue
live, so they always match what the console offers.

Two things to look for when you choose:

- **Context window.** This is how much text, counting your message and the
  chat so far, the model can take in at once. Models vary a lot here, and
  some are small. To work on a long document, pick a model with a large window
  and check that it's accepting requests right now.
- **Price.** Each model shows a price per million tokens (a token is roughly a
  short word or part of one), with separate rates for what you send and what
  comes back. The smaller models cost less.

Today's catalogue is made up of open-weight models in the Qwen, Llama and
Ternary Bonsai families. It changes over time, so treat
[/models](/models) as the source of truth, not this post.

## Everyday tasks

Things a chat model handles well:

- **Writing.** Drafting an email, rewording a paragraph so it sounds friendlier
  or more formal, or suggesting a few subject lines.
- **Summarising.** Paste in a short article or a set of meeting notes and ask
  for the three key points. Keep it within the model's context window.
- **Explaining.** "Explain this error message", "what does this clause mean",
  or "walk me through how compound interest works".
- **Coding help.** Asking what a short snippet does, or for a first draft of a
  small function. Check the result before you rely on it, just as you would
  with any other source.
- **Brainstorming.** Names, outlines, lists of questions to ask, or a quick
  plan for the week.

Smaller models make more mistakes than the largest ones. Read the answer
before you send it anywhere that matters.

### Sharing a conversation

The Share icon at the top of a chat makes a read-only link to a snapshot of
that conversation, exactly as it was when you clicked. You choose when the
link expires, and you can revoke it. See [sharing](/docs/sharing).

## What to keep out of a chat

Your messages are protected by TLS on the way to DiCompute. But the encrypted
lane that would also hide them from the people running the infrastructure is
built and not yet switched on, so the operator can read prompts and replies.
Until that changes, don't paste passwords, other people's personal data, or
anything confidential. The [trust page](/trust) and
[privacy expectations](/docs/privacy-expectations) set out exactly what is
stored and who can see it.

## Adding credit

Every message is charged in tiny amounts, at the rate shown for the model you
picked. To top up, open Settings → Billing and choose **Add credit**. This
takes you to a Stripe checkout and back to the console once the payment
settles. A few details from the [pricing page](/pricing) and the
[billing guide](/docs/billing):

- Each request first holds the most it could cost, then settles at what it
  actually used. The difference goes back to your balance straight away.
- Every request has a small minimum charge, $0.0001 according to the pricing
  page, so very short replies still cost something.
- The lowest and highest top-up amounts are set server-side and listed in the
  billing guide.

You can also set up auto-reload and spend limits. Both are included on the
standard self-serve plan, according to the [pricing page](/pricing).

## When something goes wrong

If a reply is cut off because the server restarted, the chat marks it as
interrupted and shows a Retry button within about a minute, and settling an
interrupted reply never adds a charge. For anything else, [/status](/status) shows whether
the service is healthy, and [/help](/help) is the place to ask.
