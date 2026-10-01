# DiCompute Article

The source of the posts on [dicompute.ai/blog](https://dicompute.ai/blog).

## What this repository is

One markdown file per post, plus the images those posts use. dicompute.ai
reads posts from here: a change merged to `main` is picked up by the site
automatically, with no change to the site's own code and no site deploy.

## Why it is separate

- Writers can publish and fix a post with one pull request here, without
  waiting on an engineering release.
- Banner images are binary files. Keeping them here keeps them out of the
  application's history and its bundle-size budgets.

## How publishing works

1. Open a pull request that adds or edits a file under `blog/` (and its
   images under `assets/blog/<slug>/`).
2. The `validate` check runs `scripts/validate.ts` on the pull request. Fix
   anything it reports; it prints one line per problem.
3. Merge to `main`.
4. Within about 12 minutes (a 10-minute sync plus up to 2 minutes of
   jitter) the post is live at `/blog/<slug>`, in `/blog/feed.xml`, in the
   sitemap and in blog search.

Removing or renaming a file removes or moves the post the same way. A
post's URL is its slug, so **do not rename a published post**; set
`archived: true` instead (its URL keeps working).

### What happens after merge

The site does not trust this repository's CI alone, since a direct push
to `main` skips it. On every sync the site validates the new commit again
with its own copy of the rules, and only then switches to it, atomically.
If that check fails, the site keeps serving the last commit that passed.
Nothing goes half-live, and a bad file never takes `/blog` down. The site
also refuses to publish a commit with **zero publishable posts** (no
`blog/` folder, an empty one, or only drafts), because serving it would
empty the blog. This repository's own check accepts such a branch (a
drafts-only pull request is fine); it only prints a note.

## Layout

```
README.md                          this guide
blog/
  YYYY-MM-DD-<slug>.md             one post
assets/
  blog/<slug>/banner.webp          the post's banner (see "Images")
  blog/<slug>/<name>.webp|png|jpg  in-body images
scripts/
  validate.ts                      the checks CI runs
  frontmatter.ts                   the front-matter parser (a copy of the site's)
.github/workflows/validate.yml     runs scripts/validate.ts on every PR and push to main
```

## File name

```
YYYY-MM-DD-<slug>.md
```

`YYYY-MM-DD` is the publication day and must equal the `date` field.
`<slug>` is lowercase kebab-case and becomes the URL: `/blog/<slug>`.

## Front matter

A small, strict dialect (not YAML). Every key not listed here is an error.

```
---
title: "Leaving SQLite, one store at a time"
description: "One or two sentences. This is the list card, the feed item and the meta description."
date: 2026-09-02
updated: 2026-09-05            # optional; only when the body changed after publication
authors: [DiCompute team]      # real people who agree to be named, or "DiCompute team"
tags: [postgres, ledger]       # lowercase kebab-case; each becomes /blog/tag/<tag>
categories: [engineering]      # lowercase kebab-case, at least one; the first is shown on the card
draft: false                   # optional; true keeps the post off every listing, the feed and the sitemap
archived: false                # optional; true lists it only on /blog/archived (its URL keeps working)
pinned: false                  # optional; the index's featured slot prefers this post over the newest one
cover: /blog-assets/blog/<slug>/banner.webp   # required for a published (non-draft) post
---
```

A missing required key, a date that is not a real calendar day, a boolean
that is not literally `true`/`false`, a tag or category with a capital
letter, or a published post with no `cover` is a validation error.

## Body

Plain markdown: paragraphs, `##`–`######` headings (the `title` is the
page's `<h1>`, so no `#` heading in the body), bold, italic, inline code,
fenced code blocks, links, lists, blockquotes and tables. **No raw HTML and
no embeds**: HTML in a post is shown as text, never run.

## Images

The site's Content-Security-Policy only allows images from dicompute.ai
itself, so every image lives in this repository and is served by the site
at `/blog-assets/<path under assets/>`:

| In this repo | URL in the post |
|---|---|
| `assets/blog/my-post/banner.webp` | `/blog-assets/blog/my-post/banner.webp` |
| `assets/blog/my-post/chart.png` | `/blog-assets/blog/my-post/chart.png` |

- Formats: `.webp`, `.png`, `.jpg` only. **No SVG** (it can carry script)
  and no remote URLs (the CSP blocks them).
- At most **1 MB** per image and **200 KB** per markdown file.
- File and folder names: letters, digits, `.`, `_`, `-`; not starting with a dot.
- Every `/blog-assets/...` path a post uses must exist in `assets/`.

**Banners.** 16:9, 1200×675 WebP exported from a master of at least
2400×1350, no text in the image, the subject clear of the left ~40%, and a
confirmed licence. Banners are supplied or approved by the content owner.
Until a post has one, its `cover` points at the site's generated card,
`/blog/<slug>/opengraph-image`, which is what the three current posts do;
their `assets/blog/<slug>/` folders hold only a `.gitkeep` placeholder
until a real banner lands there. To switch a post to a real banner, add
`assets/blog/<slug>/banner.webp` and change its `cover` to
`/blog-assets/blog/<slug>/banner.webp` in the same pull request. The 16:9
ratio is not checked automatically yet; check it by eye.

## Writing rules

- **Every number has a source.** Quote it from a public decision record, the
  changelog, the docs or a live page, and say which.
- **Link what a reader can reach.** Every post links at least one page on
  dicompute.ai (`/changelog`, `/docs/…`, `/decisions/…`, `/status`).
- **Dates are real.** `date` is the day the post was published.
- **Bylines are real.** A named author agreed to be named; otherwise
  `DiCompute team`.
- **Drafts are `draft: true`**, never a half-written post with `draft`
  omitted. A draft is never served on dicompute.ai.

## Check locally

```bash
bun scripts/validate.ts        # from the repository root; needs Bun 1.4+
```

## Who can publish

Anything merged to `main` is public on dicompute.ai within minutes, so
write access to this repository is write access to a production page. Ask
before you push straight to `main`; open a pull request instead.
