---
title: "Taking your AI data with you"
description: "Export single chats or your account data, delete what you don't want kept, and know what DiCompute stores."
date: 2026-10-11
authors: [DiCompute team]
tags: [data-export, privacy, account]
categories: [product]
cover: /blog-assets/blog/taking-your-data-with-you/banner.webp
coverAlt: "Duotone editorial illustration: a tilted orbit ring around a solid point, with a second point travelling the ring, picked out in accent; an amber accent on a deep ink field."
---

Data portability and deletion rights for AI chat histories drew regulatory and user attention in 2026. The practical question for you is simple: if you've spent months in a chat tool, can you get your history out, and can you remove what you don't want kept?

On DiCompute you can do both, with some limits that are worth knowing. This post covers how to export one chat, how to export your whole account, how deleting works, and what is stored. It sticks to what the [account data export guide](/docs/data-export), the [storage guide](/docs/storage) and the [chat guide](/docs/chat) say. Where those pages don't give a number, we won't invent one.

## Why owning your AI history matters

Your chats hold your drafts, your questions and often your half-formed thinking. If they only live in one service, you depend on that service to keep them, and you can't easily switch. Being able to export means you can back things up, move to another tool, or just keep a record. Being able to delete means you control what stays behind.

## Exporting one chat as Markdown or JSON

You can export a conversation from the chat's own `...` menu in the [console](/console), as Markdown or JSON. Markdown is the readable one: open it in any text editor or notes app. JSON is better if you want to process the chat with another program.

While you're there, remember that your chat list at [/chats](/chats) lets you rename, pin, archive or delete chats, and do those in bulk. Chats you have archived live at `/archived`, out of the main list but not deleted. The [chat guide](/docs/chat) covers these.

## The account data export: what it contains and what it leaves out

For everything at once, there is an account export. In the console, go to Settings → Account and choose "Export all account data". It returns your data in one response, with no job to wait for and no download link that expires.

According to the [data export guide](/docs/data-export), the bundle includes sections such as:

- **Chats**, every chat with its messages.
- **Usage**, your spending history.
- **Requests**, the outcomes of your requests, successes and failures.
- **Artifacts**, with their version history.
- **Datasets**, **preferences** and, if you opted in, **memory**.
- **Metadata** for your uploaded files and for your API keys.

It deliberately leaves out some things:

- **Key secrets.** An API key's secret is stored only in hashed form, so it can't be exported. If you lose one, you create a new one.
- **File bytes.** Uploaded files appear as metadata (name, size and so on), not the files themselves.
- **Provider session history.** The docs state this is a known gap, and the export says so instead of showing an empty list.

The export also carries an integrity checksum, so you can tell if it was altered.

## Deleting chats: archive versus delete

These two are not the same:

- **Archive** moves a chat out of your main list. It is still there, and you can unarchive it.
- **Delete** removes it. Bulk archive and bulk delete both offer an Undo right afterwards.

The chat guide also describes message-level deletes, such as rewinding a chat, which keep an Undo for a short time before the server copy is deleted.

Other items behave differently. For example, according to the [storage guide](/docs/storage), deleting an artifact keeps its past versions until you ask for a purge or a 30-day grace period ends. Uploaded batch files go to a trash tier first, unless you delete them permanently. If you close your account, the storage guide says the closure removes your chats and other account content, including artifacts and batch files.

If you need something gone completely, read the relevant section first. Don't assume that deleting always means immediate erasure.

## What is stored and for how long

The [storage guide](/docs/storage) lists what DiCompute keeps for you: avatars and organization images, artifacts and their versions, batch input and output files, and project knowledge files. It also says that who can read each thing depends on the item. Artifacts, for instance, are readable only by your account unless you publish a share link.

For retention, the honest answer is to read the sources, not a summary here. The [privacy expectations](/docs/privacy-expectations) page carries a published retention schedule per kind of log. Request metadata logs, which record things like account, model and outcome and never prompt text, are rotated daily and kept for 14 days, according to that page. For chat content and anything else, follow the docs, because we won't state periods they don't state.

Two reminders about privacy today. DiCompute's sealed lane, which would hide prompts from the operator, is built but switched off, so the operator can read prompts and replies. And no model on the list offers zero data retention. Keep sensitive material out of chats. The [trust page](/trust) gives the wider picture.

## Moving to or from another assistant

Moving in is supported. You can bring a history from another assistant into DiCompute with the import route (`POST /openai/v1/import`):

- A ChatGPT or Claude `conversations.json`, or a Gemini Takeout `My Activity.json`.
- Each conversation becomes a chat inside a project named "Imported from ChatGPT", "Imported from Claude" or "Imported from Gemini".
- There is a limit of 5,000 entries per import. Zip files are refused, so unzip first.
- Importing the same file twice skips chats already in that project.

Moving out is the exports above. Markdown chats can go into almost any notes tool. The account-wide import (`POST /openai/v1/me/import`) is deliberately narrow, and restores only your preferences, memory and projects. It is not a full restore.

## Where to go from here

- Try exporting a chat from the [console](/console) so you know what the file looks like before you need it.
- Read the [data export guide](/docs/data-export) for exactly what the account bundle contains.
- Read the [storage guide](/docs/storage) and the [privacy expectations](/docs/privacy-expectations) for what is kept and who can see it.
- See the [chat guide](/docs/chat) for archive, delete and Undo.
- New here? [Using DiCompute day to day](/blog/using-dicompute-day-to-day) covers the basics.
