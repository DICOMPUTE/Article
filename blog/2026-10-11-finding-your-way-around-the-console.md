---
title: "Finding your way around the DiCompute console"
description: "Simple mode, Pro mode and the command palette: a tour of where everything lives, and how to switch views."
date: 2026-10-11
authors: [DiCompute team]
tags: [console, getting-started, navigation]
categories: [product]
cover: /blog-assets/blog/finding-your-way-around-the-console/banner.webp
coverAlt: "Duotone editorial illustration: a tilted orbit ring around a solid point, with a second point travelling the ring, picked out in accent; an amber accent on a deep ink field."
---

AI apps have collected so many features by 2026 that many now offer a simplified
mode, so a newcomer isn't faced with every control at once. The DiCompute console
does the same. This guide is a map: what you see first, what the two modes show,
how the command palette helps you find anything, and which settings are worth a
visit early. It only describes what the console offers today.

## What you see first

Open [the console](/console) and you land on a new chat. The message box is at the
bottom, with a model menu beside it. Type, press Enter, and the reply streams in.
That is the whole product for most people, which is why everything else is
tucked away by default.

If you haven't signed in, the console offers a guest chat with limits. It is
rate-limited, uses a short list of models, stays in your browser and can't be
shared. Sign in at [/login](/login) to keep your chats on your account and use
them on other devices.

## Simple mode

Simple is the default. The sidebar shows:

- **New chat**
- **Search**
- **Projects**
- **Library**
- your **recent chats**
- one **Provider** entry

The reasoning is plain: most days you chat, find an old chat, and maybe reuse
something saved. Simple mode hides navigation only. Nothing is switched off, and
every page still opens by its address if you know it.

The Provider entry is the one item you might not expect. It shows in both modes.
If your account has a linked worker, it opens [/providers](/providers). If not, it
opens [/operate](/operate), the page about running a node. You can ignore it if
you only chat.

A good way to use Simple mode is to leave it on for a week. Notice which pages
you reach for, and what you look for and can't find. If the answer is "nothing",
you have your answer about whether you need Pro at all.

## Pro mode

Pro shows every page the console has. Switch from the **Mode** switch at the
bottom of the sidebar, or in **Settings → Appearance**. You can also open the
command palette and choose **Show all features**.

Pro is for when you've outgrown the short list and want every page in the
sidebar. Your chats and settings stay as they are, and you can switch back at
any time.

## The command palette

Press **⌘K** (Ctrl+K on Windows and Linux) to open the command palette. It lists
every page, in both modes, and you can type to narrow it. The sidebar's search
box is labeled "Search everywhere ⌘K", which is the same idea.

In Simple mode, a page that the sidebar hides carries a **Pro** badge in the
palette. That badge isn't a lock. You can open the page, and the badge only tells
you it lives in the longer list. If you're ever hunting for a page, the palette
is faster than clicking through menus.

The sidebar also collapses with ⌘B (Ctrl+B) when you want more room for the
chat.

## Your mode follows you

The mode is an account setting, not a browser setting. Choose Pro on your laptop
and your phone signs in to Pro too. A guest keeps the choice in the current
browser only. If the browser blocks local storage, the console falls back to
Simple.

## Chats, projects and the library

Your recent chats are listed in the sidebar, and **See all chats** opens
[/chats](/chats), where you can rename, pin, archive or delete them, one at a time
or several at once. Projects group related chats, and the Library holds things
you reuse. All of these are covered in the [chat guide](/docs/chat). They are
also why the palette is useful: instead of remembering where a page sits, type its
name.

## Settings worth visiting first

- **Billing.** Add credit with Stripe checkout, in Settings → Billing → Add
  credit. Models are priced per million tokens, and the live rates are on
  [/pricing](/pricing).
- **API keys.** Only needed if you want to use DiCompute from another app or
  tool. Keys are created at [/settings/keys](/settings/keys). A key is shown once,
  so copy it when you create it.
- **Appearance.** Where the Simple and Pro switch also lives.

A tip for the first visit: open Billing before you need it, so you know what a
chat costs before you run a long one.

Things that are not in the console today: voice input, read-aloud and web search
are all switched off, so don't hunt for them.

## When you get stuck

[Help](/help) is built around the questions people actually ask. Each one links
to the page that answers it, and its search box starts scoped to help but can
widen to the docs, the blog and the changelog. The [chat guide](/docs/chat) is the full reference for what a
chat can do.

## Where to go from here

- [The console](/console), to try the tour.
- The [chat guide](/docs/chat), for every per-chat action.
- [Help](/help), for the page that answers each common question.
- [Using DiCompute day to day](/blog/using-dicompute-day-to-day), for the
  non-technical walkthrough.
