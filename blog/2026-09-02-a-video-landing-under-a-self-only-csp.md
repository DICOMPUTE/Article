---
title: "A video landing page under a self-only CSP"
description: "The /l landing loaded four things from other people's servers. The console's self-only Content Security Policy blocks all four. Here is how it shipped anyway."
date: 2026-09-02
authors: [DiCompute team]
tags: [landing, csp, design]
categories: [design]
cover: /blog/a-video-landing-under-a-self-only-csp/opengraph-image
---

[Concept L](/l) is a one-screen landing page: a full-bleed looping clip, a
header, a headline set in a dot-matrix face, and a footer of four live
numbers. It was built first as a standalone folder of static HTML, CSS and
JavaScript, and in that form it worked perfectly — in a folder. Moving it into
the console, where it would actually be served, exposed a problem that is easy
to miss when a page is developed in isolation.

## The policy

Every static page the console serves carries a Content Security Policy with
`default-src 'self'`, `font-src 'self'`, `style-src 'self' 'unsafe-inline'`,
`connect-src 'self'` and no `media-src` at all (so media inherits `'self'`).
The first build loaded four things that policy forbids:

| The page loaded | From | Blocked by |
|---|---|---|
| Inter, three weights | Google Fonts | `style-src`, `font-src` |
| the dot-matrix display face | a web-font CDN | `style-src`, `font-src`, and a licensing problem besides |
| three brand icons | Font Awesome's CSS on cdnjs | `style-src` |
| the background clip, 13.9 MB at 1080p | a CloudFront URL | `media-src` |

Its stats also fetched from an absolute API origin, which `connect-src 'self'`
blocks from any host that is not that origin.

## What ships instead

Everything the page needs is now same-origin, under one directory:

- **Inter** as three local `woff2` files, latin subset.
- **Geist Pixel Circle** as the display face outright. It had been the
  fallback behind the CDN face; that face is a commercial typeface the CDN
  redistributes without a licence check, so dropping it was the right call
  twice over.
- **The three brand marks as inline SVG**, using Font Awesome Free's own
  paths under their CC BY 4.0 licence — attributed in the markup, and no
  stylesheet to fetch.
- **The clip re-encoded** from 1920×1080 to 1280×720 H.264 at CRF 27: 13.9 MB
  became 536 KB, and a side-by-side frame comparison shows no visible
  difference. A 63 KB poster frame paints until the clip decodes.
- **Stats through the same-origin API path** the rest of the site already
  uses, so the policy's `connect-src 'self'` is satisfied on every host.

Two things the console's own rules added: the page's script is inline, because
the static-page policy hashes inline scripts per request from the exact bytes
served; and the footer carries the same draft-labelled legal links every
public page here must.

## Proving it

The test that matters is not a linter. It is the console's own development
server, through its real request pipeline, in a real browser. Rendered at
1440×900, 1366×650 and on an iPhone 13 (closed and with the menu open), every
run reported zero policy violations, zero console errors and zero failed
requests, with the clip playing, all four fonts loaded and nothing overflowing
the viewport.

The footer's four numbers are live from the network feeds. On 2 September they
read `$0.05` per million input tokens, three models with an engine online,
670 requests metered — and an em dash for uptime, because the uptime sampler
had not yet recorded a tick. The page shows a dash rather than a number it
cannot stand behind; [the status page](/status) will fill it in when the
measurement exists.

## The lesson

A landing page is not done when it renders. It is done when it renders under
the headers the site actually sends. Build it inside the policy from the first
commit, or budget for the day it has to move there.
