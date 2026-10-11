---
title: "Using DiCompute with your team"
description: "Organizations, roles and pooled billing: how a small team can share one account's credit and keep control of who uses what."
date: 2026-10-11
authors: [DiCompute team]
tags: [organizations, teams, billing]
categories: [product]
cover: /blog-assets/blog/sharing-dicompute-with-your-team/banner.webp
coverAlt: "Duotone editorial illustration: a tilted orbit ring around a solid point, with a second point travelling the ring, picked out in accent; an amber accent on a deep ink field."
---

Team-wide AI use at small companies picked up through 2026, and with it came a practical problem: who pays, and who decides what people may use? This post is for the person who ends up answering those questions, such as a team lead or a founder, not for an IT department.

DiCompute has an organizations feature for this. It covers membership, roles, shared billing and limits on which models members can use. One honest limit first: single sign-on (SSO) is not configured on DiCompute today, and neither is account two-factor authentication. If your team needs either, plan around that. The details here come from the [organizations guide](/docs/organizations) and the [roles and permissions reference](/docs/org-permissions).

## Why personal accounts don't scale to a team

When every person signs up alone, each has a separate balance, separate keys and separate spending. You can't see the total, nobody can cap a colleague's usage, and someone leaving takes their account with them.

An organization puts those pieces under one roof: a roster of members with roles, an option to pay from one shared balance, and settings the owner can change for everyone.

## Creating and joining an organization

Whoever creates an organization becomes its owner. After that, the organization grows by invitation. The sequence is:

1. An owner or admin sends an invite.
2. The invited person accepts it from their own account.
3. An owner or admin approves them as a member.

Each person keeps their own sign-in. Sign-in is hosted, and [the login page](/login) shows the options, which include Google, GitHub, X and Telegram. An account can belong to more than one organization.

An organization can also set a seat cap, which limits how many active members it may have. The docs are explicit that this is only an access limit: it isn't a purchased quantity, and there is no per-seat price.

Whether ordinary members can send invites at all is a setting the organization controls, so a lead can keep invitations to owners and admins.

## Roles: owner, admin and member

There are three roles, and anything else is refused. In outline:

| Role | In practice |
|---|---|
| Owner | Founded the organization. Can do everything an admin can, plus a few things reserved to owners. |
| Admin | Manages the organization: members, billing settings, branding and similar. |
| Member | Uses the organization's resources. Can view some things, such as billing, but can't change settings. |

For example, per the roles reference, viewing the audit log is for owners and admins, while a member can see only their own audit entries. Changing billing settings needs an owner or admin.

The exact answer for any action is in the [roles and permissions reference](/docs/org-permissions). It is generated from the same table the service enforces, so it is the place to check before you assign a role. Owners and admins can also create custom roles. Powers that grant authority, such as managing members, invites and roles, can never be handed out that way.

## Pooled billing on the self-serve plan

Pooled billing is part of the single self-serve plan, according to the [pricing page](/pricing). A few points from the docs:

- **It is opt-in.** An owner or admin switches organization billing on. It is off by default.
- **It replaces, not adds.** While it is on, members' spending is charged to the shared balance instead of their own. Their personal balances are left alone, and they can use them again if they leave or if billing is switched off.
- **An owner or admin can add credit to the shared balance.**
- **Per-member monthly caps.** The owner can cap how much of the shared balance each member may spend in a month, and set a default cap for new members. The owner can also choose a threshold at which the member is alerted.
- **It's spend routing, not an invoice system.** The docs say plainly that there is no per-seat subscription behind it.

For a small team, this is the main benefit: one balance to top up and a cap per person so nobody spends the whole pot by accident.

## Limiting which models members may use

An organization can set an allowlist of models its members may use, so a lead can steer the team to the models that suit the work. The allowlist sits in the same part of the docs as limits for datasets and other resources. See the [organizations guide](/docs/organizations) for how it is set up.

Remember that the allowlist only helps if the models you allow are accepting requests. Check the live list on [/models](/models) before you rely on a model, and don't assume every model in the catalogue is available to your team.

## What isn't available yet

- **Single sign-on.** The configuration isn't switched on for DiCompute today. Don't plan around it.
- **Two-factor authentication.** Not available on accounts today.
- **A per-seat invoice.** Billing is pooled spend, not an invoice per user.
- **Certifications.** DiCompute holds none, and the [trust page](/trust) says so.

Also remember what the operator can see: prompts and replies. DiCompute's sealed lane, which would hide them from the network edge but not from the service itself, is built but off. Tell your team not to paste passwords, customer data or anything confidential.

## Where to go from here

- Read the [organizations guide](/docs/organizations) before creating one.
- Check the [roles and permissions reference](/docs/org-permissions) when you decide who gets which role.
- Look at [pricing](/pricing) to see what the self-serve plan includes.
- New to the console? Start with [Using DiCompute day to day](/blog/using-dicompute-day-to-day).
