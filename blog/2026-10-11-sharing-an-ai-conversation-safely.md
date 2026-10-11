---
title: "Sharing an AI conversation safely"
description: "Share links are read-only snapshots with an expiry you choose. Here's what they publish, how to revoke them, and what to check before you share."
date: 2026-10-11
authors: [DiCompute team]
tags: [sharing, privacy, console]
categories: [product]
cover: /blog-assets/blog/sharing-an-ai-conversation-safely/banner.webp
coverAlt: "Duotone editorial illustration: a tilted orbit ring around a solid point, with a second point travelling the ring, picked out in accent; an amber accent on a deep ink field."
---

Sharing an AI conversation is easy to do and easy to regret. Over the past
year, shared AI chat links that ended up publicly indexed made headlines, and
the lesson stuck: a share link turns something private into a public address.
The DiCompute console has a share feature built around a few plain rules. This
guide explains them, then gives you a checklist for before you click.

## Why people share, and how it goes wrong

People share chats to show a colleague a useful answer, to ask for a second
opinion, or to keep a record. Those are all good reasons. The trouble is that a
chat often holds more than you remember: a client's name, a figure from an
internal report, an address, a half-formed opinion about someone. You decide
what to share while looking at the answer you like, and the rest of the
conversation comes along with it.

## What a share link is

In the console, the Share icon in a chat's top bar publishes a **read-only
snapshot**. It captures the messages exactly as they stood when you clicked
Share and confirmed. A few consequences follow from that:

- **It doesn't update.** Anything you write in that chat afterward does not
  appear on the link.
- **It exposes nothing about your account.** The public read returns the
  published content, its expiry and its revision history. It does not return
  your account id or other conversations.
- **Recipients need no account.** Anyone with the link can open it. They can
  also report a link that publishes something illegal, harassing or
  rights-infringing.

You can replace a link's content in place without changing its address, which is
the fix for "I shouldn't have shared that" without breaking every place you
sent the old URL. Each replacement bumps a revision counter that people who
already opened the link can see.

## Choosing an expiry

The confirm dialog asks two things. The first is the **audience**: Public (an
unlisted link that anyone with the URL can read) or Organization (also listed
for active members of your organization, though the link is still the only
credential). The second is the **lifetime**: 1 day, 7 days, 30 days or never,
with 30 days pre-selected.

Pick the shortest lifetime that does the job. A quick "look at this" needs a day
or a week, not a month. The dialog states the lifetime in plain words before
the link exists, so read it. "Never" is a supported choice, but a link you have
forgotten about is exactly how old chats resurface.

## Revoking a link

Everything you have published appears in Settings → Shared links, with its
audience and its expiry date. **Revoke** ends a link at once: the next visit to
the URL no longer resolves. A link that never expires also has a **Set expiry**
action, which puts a real 30-day expiry on it without changing the URL.

Be aware of one thing about what happens afterward. According to the
[sharing docs](/docs/sharing), revoking or letting a link expire stops the
public page from working, but the stored snapshot stays until a background sweep
removes it, 30 days after the link died by default. Closing your account
deletes every share you own immediately.

## The link is the credential

There is no sign-in on a shared page. The link's token is the only thing
protecting it, so anyone who has the URL can read the snapshot, and anyone you
send it to can pass it on. Treat it like a file you are handing to someone, not
like a password-protected page. The token is long and random, so nobody can
guess a nearby one, but that does nothing if the URL itself is forwarded or
pasted somewhere public. The link also sits in the URL path, so it can end up in
browser history.

If you worry about who has seen a link, revoking it is the remedy.

## A checklist before you share

1. **Scroll the whole chat.** The snapshot is every message, not just the good
   answer.
2. **Names.** Colleagues, clients, family, your own full name.
3. **Numbers.** Account numbers, salary figures, internal metrics, prices you
   haven't announced.
4. **Internal details.** Project code names, system names, anything from a
   document you pasted in.
5. **Credentials.** If a key or password ever went into the chat, don't share
   it, and replace the key.
6. **Copy the content you want.** If only one answer matters, paste it into a
   new chat and share that one instead.
7. **Choose the shortest expiry** that fits.

For a longer account of what the operator can and cannot see in your chats, read
[privacy expectations](/docs/privacy-expectations). The sealed transport lane is built but switched off today, so the operator can
read prompts and replies, and the privacy page says plainly not to send
regulated data.

## Guest chats can't be shared

If you use the console without signing in, your chat stays in your browser. It
doesn't sync, and it can't be shared, because sharing needs a signed-in session.
Sign in at [/login](/login) before you start a conversation you expect to share.

## Where to go from here

- The [sharing docs](/docs/sharing), for audiences, expiry, revocation and the
  rules behind them.
- [Privacy expectations](/docs/privacy-expectations), for who can see what.
- [The console](/console), to open a chat and find the Share icon.
- [Using DiCompute day to day](/blog/using-dicompute-day-to-day), for the rest of
  the console.
