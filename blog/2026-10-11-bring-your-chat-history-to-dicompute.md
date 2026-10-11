---
title: "Bringing your chat history from ChatGPT, Claude or Gemini"
description: "Import your conversations from another assistant's export file, so switching to open models doesn't mean starting from zero."
date: 2026-10-11
authors: [DiCompute team]
tags: [import, switching, chat]
categories: [product]
cover: /blog-assets/blog/bring-your-chat-history-to-dicompute/banner.webp
coverAlt: "Duotone editorial illustration: a tilted orbit ring around a solid point, with a second point travelling the ring, picked out in accent; an amber accent on a deep ink field."
---

In 2026 more people are using several AI assistants side by side, and many have
asked for the right to take their data with them. Moving a conversation
history is the part that makes switching feel expensive. This guide covers the
import feature in the DiCompute console: which files it accepts, what each
conversation turns into, and what it leaves behind. It also says plainly that
an import is a copy of text, not a perfect mirror of everything the old
assistant stored.

## Why your history is the real switching cost

A new assistant is easy to try. What keeps you from moving is the pile of old
chats: the recipe you refined over a week, the cover letter draft, the long
thread where you finally got a spreadsheet formula right. If those stay behind,
you end up keeping two accounts open "just in case".

Import removes that excuse. You bring the conversations across once, and they
sit next to your new ones, where you can search them and continue them with an
open model.

## Getting your export

Each service lets you request a copy of your data from its own settings. Once
you have the file, you need one specific piece of it:

| Source | The file DiCompute reads |
|---|---|
| ChatGPT | `conversations.json` from the export |
| Claude | `conversations.json` from the export |
| Gemini | `My Activity.json` from a Google Takeout export |

Export files usually arrive as a zip archive. **Unzip it first.** DiCompute
refuses zip archives (with a clear reason) and wants the JSON file itself. The
[data export docs](/docs/data-export) describe the import in full, including
the exact file names.

To run the import, sign in and open **Settings → Privacy**. The **Import
chats** card has a file picker: choose the JSON file and the import starts. You don't need to tell DiCompute where the file came from. It
detects the source for you.

## What import does

Each conversation in the file becomes one chat in your account, with its roles
(who said what) and its original dates. The chats land in a project named
after the source: **Imported from ChatGPT**, **Imported from Claude** or
**Imported from Gemini**. Because chats keep their original dates, an old
conversation sits where it belongs in your history rather than appearing as
"new today".

Gemini needs one extra rule. A Google Takeout activity file has no
conversation id, so DiCompute groups prompts that are less than 30 minutes
apart into a single chat. Expect a Gemini import to group a little
differently than you remember the conversations.

Importing the same file twice is safe. Chats that are already in that project
are skipped and counted as duplicates, matched on their original creation time
and title. One catch: if you rename an imported chat and then re-import, the
renamed chat no longer matches, so the original comes in again.

When the import finishes, the response tells you how many chats were imported,
how many were skipped (duplicates are included in that number) and how many
failed.

## What it skips or refuses

- **Temporary chats.** Conversations marked temporary in the source are
  skipped, which matches what you asked for when you made them temporary.
- **Zip archives.** Refused. Unzip and pick the JSON file.
- **Files over the limits.** An import accepts up to 5,000 entries. There is
  also a file-size limit. A file over it is refused with an error that names
  the limit, so you know what to cut down.

Not every field in an export carries over. An import brings in the conversation
text, roles and dates. Treat it as a copy of what you said and what the
assistant answered, and don't assume that attachments, settings or anything else
the old service stored have moved with it. Open a few imported chats and check
the ones you care most about.

## Privacy

The file is treated as data and nothing more. Links inside your old
conversations are never opened, so importing a history full of URLs doesn't
cause DiCompute to go and fetch any of them.

Remember what the file contains: your whole conversation history, which may
include things you would not want a stranger to read. DiCompute's sealed
transport lane is built but switched off today, which means the operator can
read prompts and replies. Don't import anything you wouldn't send in a normal
chat. The [privacy expectations page](/docs/privacy-expectations) spells out
who can see what.

## Tidying up afterwards

After a big import you'll have a lot of chats at once. Open [/chats](/chats)
and use the tools the console already has: rename the ones you'll keep using,
pin the favorites, archive the rest. You can select several chats and archive or
delete them in one go, and both bulk actions offer an Undo straight after. Search
looks through chat titles everywhere, and through message text for chats this
browser has opened. The [chat guide](/docs/chat) covers these actions in more
detail.

Imported chats are ordinary chats. Continue one by choosing a model and typing
your next message, keeping in mind that each model has its own context window.
Check [/models](/models) for today's figures.

## Where to go from here

- [Using DiCompute day to day](/blog/using-dicompute-day-to-day), for the
  rest of the console.
- The [chat guide](/docs/chat), for what the console offers on each chat.
- [Account data export](/docs/data-export), for the import rules and the
  reverse direction, taking your DiCompute data out.
- [/chats](/chats), to sort your imported history.
