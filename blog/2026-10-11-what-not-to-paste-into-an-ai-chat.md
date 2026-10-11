---
title: "What not to paste into an AI chat"
description: "A plain-language privacy checklist for AI chat: who can read your prompts on DiCompute today, and what to keep out until that changes."
date: 2026-10-11
authors: [DiCompute team]
tags: [privacy, safety, chat]
categories: [product]
cover: /blog-assets/blog/what-not-to-paste-into-an-ai-chat/banner.webp
coverAlt: "Duotone editorial illustration: a tilted orbit ring around a solid point, with a second point travelling the ring, picked out in accent; an amber accent on a deep ink field."
---

AI data leaks, and workplace rules against pasting confidential text into chatbots, kept privacy near the top of AI worries in 2026. If you use any AI chat, DiCompute's included, it helps to have a simple checklist for what stays out of the message box.

This post is blunt on purpose. On DiCompute today, the people running the service can read your prompts and the replies. The end-to-end encrypted lane that would change that is built, and switched off. So the advice below is not cautious boilerplate. It follows from how the service works right now.

## Why this matters more now

It used to take effort to hand a stranger a whole document. Now people paste entire contracts, meeting notes, spreadsheets and customer emails into a chat window to get a summary. It takes two seconds and feels like talking to a tool. But a chat box sends your text to a computer you don't control. Once it's sent, you can't take it back.

## What protects your messages today, and what doesn't

DiCompute protects messages in transit with TLS, the same lock-icon protection your browser uses for any secure website. That keeps people on the network between you and the service from reading what you send.

TLS does not hide your message from the service itself. According to the [privacy expectations guide](/docs/privacy-expectations), a message on the normal lane is plaintext at each stage that handles it after TLS ends, so two parties can see a prompt: the edge network provider, and the operator of DiCompute. The guide says this is the same trust model as most hosted AI services, and "not 'nobody sees this'".

There is a more private option in the design, called sealed transport. It is built but switched off, so you can't use it today. Even when it is on, the guide says the operator still has to decode a message to process it, so it narrows who sees your text rather than hiding it from everyone.

Two further points from the [trust page](/trust) and the guide:

- The service holds no compliance certifications today.
- The [privacy policy](/privacy) and [terms](/terms) are drafts that are still under legal review.

## Never paste

Keep these out of any AI chat on this service:

- **Passwords, API keys and recovery codes.** If you paste a secret, treat it as exposed and change it.
- **Other people's personal data.** Names with addresses, phone numbers, medical or financial details, or a customer list. They didn't agree to you sharing it.
- **Confidential work.** Anything covered by an employer's rules, a non-disclosure agreement, a client contract or regulations. If your workplace bans pasting such text into AI tools, that ban applies here too.
- **Regulated data.** Health records, payment card numbers and similar. Both legal pages tell you not to send regulated data on this lane.
- **Anything you couldn't say to a stranger.** A simple test: if you'd be upset to see it quoted back to you by someone you don't know, leave it out.

## How to anonymize a document first

You can often get the help you need without the sensitive parts. Before you paste:

1. **Replace names with labels.** "Dana" becomes "Person A", "Acme Ltd" becomes "Company X".
2. **Remove identifiers.** Take out account numbers, addresses, phone numbers, ID numbers and dates of birth.
3. **Round or change figures** that matter. If the question is about the structure of a budget, a model can help with made-up numbers as well as with real ones.
4. **Paste only the part you need.** Don't send a ten-page contract to ask about one clause.
5. **Read it once more before you press Enter.** Look for what you missed: a signature block, a footer with an address, a name in a file name.

Keep your own key from the labels, such as "Person A is Dana", on your side, and swap the real names back into the answer afterwards. Be aware that an anonymized document can still identify someone if enough detail remains. If in doubt, take more out.

## Temporary chats, deleting chats, and what is stored

Signed-in chats are saved to your account so they can sync across your devices. That means the text of your messages is stored with your account. The [chat guide](/docs/chat) describes a temporary chat mode, which skips some features such as automatic title generation, but it does not say a temporary chat is hidden from the operator, so don't treat it as private.

You can rename, archive and delete chats from [/chats](/chats). Deleting removes a chat from your list. For how long different kinds of records are kept, read the "Logs and retention" part of the privacy expectations guide, because the answer depends on the kind of record. The [trust page](/trust) summarizes what the service logs. According to the guide, request logs record things like account, model, outcome and token counts, not the text of your prompts.

DiCompute does not offer zero data retention on any model today, so don't rely on deletion to unsend something sensitive.

## Where to read the full detail

- [Privacy expectations](/docs/privacy-expectations): who sees a prompt, hop by hop, and the retention table.
- [Trust](/trust): what the service says about its security and logging.
- [Privacy policy (draft)](/privacy): the legal text, with its draft status.
- [Using DiCompute day to day](/blog/using-dicompute-day-to-day): the basics, including the short list of what to keep out.

If a task needs real privacy, the honest answer today is not to use this service for it yet. For everything else, a few seconds of anonymizing is cheap insurance.
