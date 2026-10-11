---
title: "Organizing your AI chats with projects and the library"
description: "Pin, archive, search and group your conversations so a month of AI use stays findable."
date: 2026-10-11
authors: [DiCompute team]
tags: [console, organization, productivity]
categories: [product]
cover: /blog-assets/blog/organizing-chats-projects-and-the-library/banner.webp
coverAlt: "Duotone editorial illustration: a tilted orbit ring around a solid point, with a second point travelling the ring, picked out in accent; an amber accent on a deep ink field."
---

In 2026, AI chat has become daily work for a lot of people, and a side effect
shows up within weeks: a sidebar of hundreds of conversations with names like
"Help with letter" and "Quick question". Finding the one you need becomes its own
chore. The DiCompute console has several tools for this. This guide shows which
to use for what, and is honest about what is console-only and what isn't built
into the console yet.

## The cluttered-sidebar problem

Every chat you start is saved to your account when you're signed in, and the
list follows you to other devices. That's useful until the list is long. The
fix isn't a perfect system. It's a handful of small habits applied as you go.

## Projects: grouping related chats

A **project** is a group for related chats, so that "the kitchen renovation"
or "job search" sits together instead of being scattered through a single list.
Projects are listed in the console's sidebar in the default Simple mode. The
[chat guide](/docs/chat) describes Projects and the Library as synced stores
alongside your chats: they follow your account, so they show up on the other
devices you sign in on.

The **Library** sits next to Projects in the sidebar. It holds the things you
reuse rather than the things you discuss, such as saved prompts, presets and
artifacts. If you find yourself pasting the same instructions at the start of
every chat, that is a saved prompt waiting to happen.

A simple rule works well: if you expect to come back to a topic more than twice,
give it a project.

## Pin, rename, archive and delete

Open [/chats](/chats) (the "See all chats" link in the sidebar leads there).
For each chat you can:

- **Rename.** The auto-generated title is a start. A name you'll recognize in
  three weeks is worth ten seconds.
- **Pin.** Keep the handful of chats you return to at the top.
- **Archive.** Move a finished chat out of the default list without deleting it.
- **Delete.** For chats you don't need at all.

You don't have to do this one chat at a time. Select several and archive or
delete them together. Both bulk actions offer an **Undo** straight afterward,
so a mis-click isn't permanent, but don't treat that as a license to be careless
with delete. Archive is the safer default whenever you're unsure.

## Search

Search works over every chat's title. It also searches the message text of chats
that **this browser has opened**. A chat synced from another device that you've
never opened here has no message text stored locally, so only its title can match.

That has a practical consequence. If you search for a phrase you know you wrote
and nothing turns up, open the chat list on the device where you had the
conversation, or try a word you'd expect in the title. And it's one more reason
to rename chats: a good title is the one thing every search can match.

## Archived chats

Archived chats live at [/archived](/archived). They're out of the default list
but not deleted, and you unarchive them one row at a time from that page. Use it
as a quiet shelf: finished work you might want to look at again.

## Exporting a chat

Open a chat's own `...` menu to export it as Markdown or JSON. Markdown is
easiest to read or paste into a document. JSON keeps the structure and is better
for a backup or for moving the conversation elsewhere. The same menu lets you
import a conversation in either format. If you want everything at once rather
than one chat at a time, the [account data export](/docs/data-export) covers
the full bundle.

## Habits that save time later

- **Name a chat when it turns useful**, not when you finish it. By then you may
  have forgotten what made it worth keeping.
- **Start a new chat per task.** Mixed-topic chats are the hardest to name,
  search and archive, and a fresh chat also keeps the model focused.
- **Archive early.** An archived chat costs nothing to keep and leaves your main
  list readable.

## A tidy-up routine

Five minutes, once a week:

1. Open [/chats](/chats).
2. Rename anything still titled with its first few words.
3. Pin the chats you're actively using.
4. Select the finished ones and archive them in bulk.
5. Delete what you really don't need.

## One thing the console doesn't do yet

Chats can carry tags through the API, but the console has no tag editor or tag
filter chips today. In the console, use projects, pins and good titles. The
[chat guide](/docs/chat) is where any change to this will be documented first.

## Where to go from here

- [Using DiCompute day to day](/blog/using-dicompute-day-to-day), for the
  broader tour of the console.
- The [chat guide](/docs/chat), for the full list of per-chat actions.
- [/chats](/chats) and [/archived](/archived), to put the routine above to use.
