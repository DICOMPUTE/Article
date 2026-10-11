---
title: "Using AI as a study partner, not a shortcut"
description: "Explanations, practice questions and summaries: how students can learn with an AI chat model without letting it do the thinking."
date: 2026-10-11
authors: [DiCompute team]
tags: [education, everyday-ai, students]
categories: [product]
cover: /blog-assets/blog/using-ai-as-a-study-partner/banner.webp
coverAlt: "Duotone editorial illustration: a tilted orbit ring around a solid point, with a second point travelling the ring, picked out in accent; an amber accent on a deep ink field."
---

AI in education was one of the most debated topics of 2026, and plenty of schools wrote their own AI-use rules. Students are using chat models heavily. Teachers are worried about it. Both reactions make sense.

This post is for students, and for anyone learning something new. It describes ways to use a chat model that leave you knowing more, not just holding a finished answer. The examples use the open models in the [DiCompute console](/console). One honest warning up front: these are small open models, and they get things wrong. Nothing a model says here should be treated as automatically correct.

## Learning with AI versus outsourcing to it

Here is a simple test. After the chat, could you explain the idea to a friend without the screen open? If yes, you learned something. If not, the model did the thinking and you just copied the result.

Outsourcing feels efficient, but it skips the part that makes knowledge stick, which is the effort of working it out. Learning with AI means keeping that effort and using the model as a patient helper around it. The patterns below all follow that rule: you do the work, and the model explains, asks and checks.

## Ask for explanations at your level

A model can explain the same idea ten ways. Tell it who you are and where you're stuck:

- "Explain photosynthesis to someone who has never studied biology."
- "I understand what a derivative is, but not why the chain rule works. Explain only that."
- "Give me an analogy, then the formal definition."

If the answer is too hard, say so: "Simpler, with an everyday example." If it is too easy, say that too. This back and forth is where a chat model is most useful, because a textbook can't adjust itself.

Then try to say it back in your own words and ask the model whether you got it right. That turns a reading task into an active one.

## Have it quiz you, then check your answers

Reading something again feels productive but teaches little. Being tested teaches more. Ask the model to test you:

`Ask me five questions on chapter 3, one at a time. Wait for my answer before the next one. Don't give me the answers.`

Answer from memory, without looking. After each reply the model can tell you what was missing. If you got one wrong, ask "Why is that wrong?" and then ask for a similar question to try again.

Two cautions:

- **The model can be wrong about the correct answer.** For anything that will be graded, compare against your notes, your textbook or your teacher. A quiz from a small model is practice, not an answer key.
- **Don't peek.** The temptation is to ask for the answer straight away. Make yourself commit to an answer first.

## Summarize your own notes, not the textbook

Summaries are a good use of a model, with one twist: summarize *your* material. Paste in your own lecture notes and ask:

- "Turn these into a one-page outline."
- "What's missing or unclear in these notes?"
- "List five terms here I should be able to define."

This works better than summarizing the textbook, because the gaps in your notes are the gaps in your understanding. A summary of a chapter you haven't read leaves you with a paragraph and no understanding.

Keep your text short. The model that accepts requests directly today, `qwen2.5-3b-instruct`, has a context window of 1,024 tokens according to `/openai/v1/models`. That is how much text, your message plus the chat so far, the model can take in at once. Longer notes need a model with a bigger window, and it must be accepting requests right now. Check [/models](/models) for each model's window and whether it is accepting. The model list changes, so don't rely on this post for it.

## Respect your school's rules on AI use

Rules differ between schools, courses and even assignments. Some allow AI for brainstorming but not for writing. Some ban it outright. Some ask you to say how you used it. DiCompute can't tell you what your school allows, and nothing here is a claim about any institution's policy.

So read the rules for each course. If they're unclear, ask your teacher before you start, not after. Practices that are almost always fine are using AI to study for a test, to understand a concept or to get feedback on your own draft. Submitting generated text as your own work is a different thing, and many schools treat it as cheating.

## Keeping costs tiny with small models

DiCompute is pay-per-use: you add credit and each message is charged at the rate for the model you picked. The prices below come from the [pricing page](/pricing) as read today, and they can change, so check it for current rates:

| Model | Input per 1M tokens | Output per 1M tokens |
|---|---|---|
| `qwen2.5-3b-instruct` | $0.05 | $0.20 |

Each request also has a minimum charge of $0.0001, according to the pricing page. A token is roughly a short word or part of one, so a study session of short questions and answers is a very small amount of text. Other models in the catalogue are priced differently, and some are not accepting requests right now, so look at [/models](/models) before you plan around one.

## Where to go from here

- Open the [console](/console) and try the quiz prompt on your next set of notes.
- Compare options and prices on [/models](/models) and [/pricing](/pricing).
- Read [Using DiCompute day to day](/blog/using-dicompute-day-to-day) for the basics of chats, models and adding credit.
- Keep personal details and anything confidential out of chats. The [trust page](/trust) explains what the operator can see.
