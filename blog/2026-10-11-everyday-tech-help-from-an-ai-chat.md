---
title: "Everyday tech help from an AI chat"
description: "Spreadsheet formulas, error messages, phone settings and small scripts: getting practical tech help when you're not a developer."
date: 2026-10-11
authors: [DiCompute team]
tags: [everyday-ai, productivity, how-to]
categories: [product]
cover: /blog-assets/blog/everyday-tech-help-from-an-ai-chat/banner.webp
coverAlt: "Duotone editorial illustration: a tilted orbit ring around a solid point, with a second point travelling the ring, picked out in accent; an amber accent on a deep ink field."
---

"Vibe coding" and AI help for people who don't program went mainstream in 2025 and 2026. You don't have to be a developer to ask a chat model why your spreadsheet shows an error, what a cryptic message on your screen means, or how to rename two hundred files at once.

This post is a small cookbook for those chores, using the chat in the [DiCompute console](/console). It comes with an honest caveat: the models are small open models, and they sometimes give confident answers that are wrong. Never run anything a model generates until you've read it and understood what it does.

## Why AI is a good first stop

Small tech problems are awkward to search for. You don't know the right words, the top results are written for experts, and your exact situation is never quite covered. A chat model lets you describe the problem in your own words, ask a follow-up, and say "simpler, please".

It is a good first stop for:

- Working out what a message or setting *means*.
- Getting a first draft of a formula or a short script.
- Learning the name of the thing you're trying to do, so you can look it up properly.

It is not a good last stop. Treat the answer as a lead to confirm, not a ruling.

## Spreadsheet formulas

The trick is to describe your layout, not just your goal. A good prompt names the columns and gives an example row:

`Column A has dates, column B has the amount, column C has a category. I want the total for "Groceries" in March. Give me the formula for Google Sheets, then explain each part.`

Three habits make this work:

- **Name your tool.** Formulas differ slightly between spreadsheet programs. Say which one you use.
- **Give a sample.** Two or three example rows remove most guesswork.
- **Ask for the explanation.** If you understand the formula, you can fix it when your data changes.

Then test the formula on a few rows where you already know the answer, before you trust it on the whole sheet.

## Decoding error messages: paste the message, not your passwords

Copying an error message into a chat is one of the best uses of an AI model. Ask:

- "What does this mean in plain English?"
- "What are the three most likely causes, starting with the simplest?"
- "What should I try first, and how will I know if it worked?"

Before you paste, read what you're about to send. Error messages and log files sometimes contain file paths with your username, addresses, tokens or passwords. Delete those parts, or replace them with a placeholder such as `[removed]`. The model only needs the wording of the error and a sentence about what you were doing when it appeared.

## Small scripts and shortcuts: ask what each line does before you run it

A model can write a short script to rename files, tidy a folder or pull numbers out of a text file. The safe way to use one:

1. **Ask for a plain-language walkthrough.** "Explain what each line does. Tell me if anything deletes, overwrites or sends data anywhere."
2. **Read the answer against the code.** If a line mentions deleting files, passwords, downloading something or sending data to a web address and you didn't ask for that, stop.
3. **Try it on copies.** Make a test folder with a few duplicate files, and run it there first.
4. **Keep a backup.** Anything that changes or removes files should only run on data you could restore.

Generated code is never safe just because it looks neat. A script that does the wrong thing quickly is worse than one that does nothing. If a model gives you a command that begins with something like `sudo` or `rm`, or that pipes a download straight into your shell, ask what it does and find a second source before you run it.

## When to stop and ask a human

Stop and get help from a person when:

- The task touches your only copy of something you can't replace.
- It involves money, accounts, or your device's security settings, and you're not sure what a step does.
- The model's advice contradicts itself, or contradicts what the manufacturer's own help page says.
- You've tried two or three of its suggestions and things are getting worse.
- Someone else's data is involved, such as customers, colleagues or family.

A short list of questions for a friend, a colleague or the vendor's support line often saves more time than a long chat, and the model can help you write that list.

## Keeping secrets out of tech-support chats

The chat is not a private conversation with a single trusted person. The operator can read prompts and replies. Messages travel over TLS, but that protects them in transit, not from the service itself. DiCompute's sealed lane, which would also hide prompts from the network edge in front of the service, is built but switched off, and it would not hide them from the service either. The [trust page](/trust) and the [privacy expectations](/docs/privacy-expectations) page set out who can see what.

So, in any tech-help chat, leave out:

- Passwords, recovery codes, one-time codes and API keys.
- Bank, card and ID numbers.
- Other people's personal details.
- Anything confidential from work.

If you've already pasted something sensitive, treat it as exposed: change that password or rotate that key.

## Where to go from here

- Try a first question in the [console](/console). Start with an error message you've seen before and already understand, to see how the model handles it.
- Read [Using DiCompute day to day](/blog/using-dicompute-day-to-day) for how to pick a model and add credit.
- Check the [trust page](/trust) before you paste anything you wouldn't hand to a stranger.
- Keep your prompts short. Some models have small context windows, which you can see on [/models](/models).
