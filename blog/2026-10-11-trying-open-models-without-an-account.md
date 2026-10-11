---
title: "Trying open AI models before you create an account"
description: "The console's guest lane lets you stream a real reply with no sign-up. Here is what it allows, what it doesn't, and when to sign in."
date: 2026-10-11
authors: [DiCompute team]
tags: [console, getting-started, chat]
categories: [product]
cover: /blog-assets/blog/trying-open-models-without-an-account/banner.webp
coverAlt: "Duotone editorial illustration: a tilted orbit ring around a solid point, with a second point travelling the ring, picked out in accent; an amber accent on a deep ink field."
---

By 2026, trying an AI product before you sign up has become the norm. Many people, especially the privacy-minded, want to see a real reply before they hand over any details. DiCompute has a way to do that: a **guest lane** in the console that streams a real answer from an open model with no account and no API key.

This post walks through what the guest lane gives you, where its limits are, and when it makes sense to sign in. The short version: it is a free sample, deliberately small. It is not a permanent, unlimited way to use the service.

## What the guest lane is

Open [the console](/console) without signing in and you can type a message and watch the reply stream in, the same as a signed-in chat. Behind it is a real model, serving right now. The [demo page](/demo) describes it as "a real, rate-limited slice of the same network", with "a handful of free messages".

Use it to answer simple questions. Is the reply quality good enough for what I'd ask? Does streaming feel responsive? Is this kind of tool for me?

## Its limits

The guest lane is a sample, so it is built with ceilings. According to the [chat guide](/docs/chat):

- **A guest model allowlist.** A guest can use only the models the service has allowed for guests, not the full catalogue.
- **A rate limit.** Guests get only a few messages in a short window, so a flood of visitors can't use the lane up. If you hit the limit, wait a little and try again, or sign in.
- **A 16,000-character prompt cap.** A guest conversation's prompt text is capped. That is plenty for a question or a short passage, and not enough for a long document.
- **No sharing.** A guest chat can't be turned into a share link.

The guest lane can also be switched off by the service. The [privacy guide](/docs/privacy-expectations) says it is on only where the deployment enables it. So don't build a routine around it. If you find it unavailable or you've used your allowance, that is normal behavior, not a fault.

## Where guest chats live

A guest chat is **browser-local**. It stays in the browser you typed it in. Nothing syncs to a server-side account, because you don't have one, and nothing follows you to another device.

That has practical consequences:

- Clearing your site data, or using a private window and closing it, can lose the conversation.
- A chat you started on your phone won't be there on your laptop.
- If you get an answer you want to keep, copy it out.

The [privacy guide](/docs/privacy-expectations) also notes that a guest leaves no account, session or cookie behind on the server side. That is not the same as private. A guest request travels the same way a signed-in one does, so the operator can read what you send. Don't paste anything confidential, even into a trial. The [trust page](/trust) has the detail.

## The /demo page

If you'd like to see the quality before typing anything, the [demo page](/demo) starts with a recorded exchange. It shows a prompt, labeled "Before", and the answer a model gave, labeled "After". The recorded example, made on 2026-09-18, asked `qwen2.5-3b-instruct` to explain what a micro-USD is in one sentence, and it answered in one sentence. The page states the date of the recording, so you know how old it is.

Below the recording is a button that opens the live demo, which sends a prompt to a real model on the guest lane.

## What signing in adds

Signing in turns the sample into a normal account. According to the [chat guide](/docs/chat) and the [day-to-day guide](/blog/using-dicompute-day-to-day), you get:

- **Synced chats.** Your conversations are saved to your account and appear on any device you sign in on, with rename, pin, archive, search and export.
- **Projects and a library.** Saved prompts, presets and projects sync with your account too.
- **Sharing.** A read-only link to a snapshot of a chat, with an expiry you choose and a way to revoke it.
- **More models.** You are no longer limited to the guest allowlist. Not every listed model is open to you yet: the larger ones run on the provider network, which carries traffic for one internal test account only today. [/models](/models) shows what is accepting requests.
- **Credit.** You add credit through a Stripe checkout and pay per use, so you are not limited to the guest allowance.

## Signing in with Google, GitHub, X or Telegram

When you decide to sign in, open the [login page](/login). Sign-in is handled through a hosted flow, and the page shows buttons for Google, GitHub, X and Telegram. Pick one. Your account is created the first time you sign in, so there is no separate sign-up form and no password to remember.

If you have a guest chat you want to keep, copy it out first. A guest chat is stored only in the browser, and the chat guide doesn't say it moves to your account when you sign in.

## Where to go from here

- Try the guest lane in [the console](/console).
- Watch the recorded example on the [demo page](/demo).
- Read the [chat guide](/docs/chat) for how signed-in chats work.
- Sign in from the [login page](/login) when you're ready.
- For a normal day of use, read [Using DiCompute day to day](/blog/using-dicompute-day-to-day).
