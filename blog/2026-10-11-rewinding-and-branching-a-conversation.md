---
title: "Rewinding and branching an AI conversation"
description: "Take a chat back to an earlier message, or branch it into a new chat to try a different direction, without losing the original."
date: 2026-10-11
authors: [DiCompute team]
tags: [console, chat, productivity]
categories: [product]
cover: /blog-assets/blog/rewinding-and-branching-a-conversation/banner.webp
coverAlt: "Duotone editorial illustration: a tilted orbit ring around a solid point, with a second point travelling the ring, picked out in accent; an amber accent on a deep ink field."
---

Branching and versioned chats became a standard feature request across AI chat apps in 2026. People wanted a way to try a different direction without wrecking a conversation that was going well. DiCompute's console has two actions for exactly that: **Rewind to here** and **Branch into new chat**.

This post explains what each one does, how to find them, and when to use which. You don't need any technical knowledge, only a signed-in chat in [the console](/console).

## Why conversations go off track

A chat model reads the whole conversation each time it replies. That is how it remembers what you said earlier. It is also why a conversation can go wrong in a way that is hard to fix. Perhaps you asked for a formal email and the first answer is too stiff. You say "make it friendlier", and now the draft is a blend of two ideas. Or an early answer took a wrong turn, and every later reply builds on it.

Starting a new chat throws away the context that was working. Rewind and Branch let you keep the good part and change only what comes after it.

## Rewind to here

**Rewind** takes the chat back to an earlier message. Pick a message, choose **Rewind to here**, and every message after it is removed. The conversation continues from that point, as if the later messages had never been sent.

Use it when the later messages were a mistake and you want them gone: a wrong turn, a reply you don't want the model to build on, or a question you'd rather ask differently.

Rewind has a safety net, because removing messages is a big step:

- The chat guide says it offers **Undo for 10 seconds** before the server copy is deleted. If you rewound the wrong message, press Undo in that window.
- The delete is a soft delete, the same as deleting any other message.
- From a single message's menu, Rewind asks you to confirm first, and the Undo appears in a notification.

After the 10 seconds, treat the removed messages as gone.

## Branch into new chat

**Branch** makes a copy instead of changing the original. Pick a message, choose **Branch into new chat**, and DiCompute creates a new, independent chat holding the conversation up to that message. It keeps the same model, project and system prompt (the standing instructions for the chat), so the branch starts out set up like the original.

The original chat is not touched. The two chats are separate from then on, and a branch shows a small branch icon in the chat lists so you can tell it apart.

Use it when you want to try something without risking what you have.

## Finding both actions

There are two places:

1. **The chat menu.** Open the ... menu for the chat and choose **Rewind or branch...**. Then pick the message you want to go back to, and choose Rewind to here or Branch into new chat.
2. **A message's own menu.** Each message has a ... menu with the same two actions, so you can act on the message you are looking at.

Both are switched off while a reply is streaming. Wait for the reply to finish, and then the actions are available.

## Patterns that work

**Two tones for one email.** You've asked for a draft and you like the content. Branch from your original request. In the original chat ask for a formal tone, and in the branch ask for a friendly one. Compare the two side by side in two tabs, and keep the one you like.

**Exploring an alternative plan.** You're planning a trip, a week of meals or a small project, and the model has proposed an approach. Branch at that message and ask "what if the budget were half?" in the branch. Your first plan stays intact in the original chat.

**Undoing a wrong turn.** If a reply goes somewhere you don't want, use Rewind to the last good message and ask again, with a clearer question. This keeps the chat short, which helps. Models have a limited context window, and a long chat full of dead ends uses it up.

**Rule of thumb.** If you might want the later messages again, Branch. If you're sure you don't, Rewind. Branching is the safer choice when you're unsure.

## Limits to know

- **Both are off while a reply streams.**
- **The branch link stays in this browser only.** The link between a branch and the chat it came from is kept in the browser where you made the branch. It isn't yet stored on your account, so it won't follow you to another device. Each chat still syncs as an ordinary chat. What doesn't sync is the record of which chat it was branched from. The [chat guide](/docs/chat) notes this.
- **Rewind is not a long-term history.** The Undo is available for 10 seconds only.
- **You need a saved chat.** The chat guide describes these actions on chats saved to your account (Rewind deletes the server copy of the later messages). A signed-out guest chat is a different, browser-only lane, so sign in before you rely on them.

Your chats are listed at [/chats](/chats), where you can rename, pin, archive or delete both the original and any branches.

## Where to go from here

- Try the actions in [the console](/console) on a chat that has a few messages.
- Read the full list of chat features in the [chat guide](/docs/chat).
- Manage your chats and branches at [/chats](/chats).
- Start with the basics in [Using DiCompute day to day](/blog/using-dicompute-day-to-day).
