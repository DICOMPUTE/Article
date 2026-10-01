#!/usr/bin/env bun
// Validates this repository the way dicompute.ai will read it. Run locally
// with `bun scripts/validate.ts` (from the repo root) and in CI by
// .github/workflows/validate.yml on every pull request and push to main.
//
// Exit 0: every rule below holds. Exit 1: one line per problem, then a
// count. The rules are the server's post rules (mirrored from its loader;
// the server re-checks every commit before publishing it) plus the asset
// rules for this repo's own images. See README.md for the contract.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join, relative, sep } from "node:path";
import { FrontMatterError, parseDocument, type Schema } from "./frontmatter";

const ROOT = process.argv[2] ?? process.cwd();
const BLOG = join(ROOT, "blog");
const ASSETS = join(ROOT, "assets");

const SCHEMA: Schema = {
  title: { type: "string", required: true },
  description: { type: "string", required: true },
  date: { type: "date", required: true },
  updated: { type: "date" },
  authors: { type: "string[]", required: true },
  tags: { type: "string[]", required: true },
  categories: { type: "string[]", required: true },
  draft: { type: "boolean" },
  archived: { type: "boolean" },
  pinned: { type: "boolean" },
  cover: { type: "string" },
};
const POST_FILE = /^(\d{4}-\d{2}-\d{2})-([a-z0-9]+(?:-[a-z0-9]+)*)\.md$/;
const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ASSET_SEGMENT = /^[A-Za-z0-9_][A-Za-z0-9._-]*$/;
const IMAGE_EXT = new Set([".webp", ".png", ".jpg", ".jpeg"]);
const MAX_POST_BYTES = 200 * 1024;
const MAX_IMAGE_BYTES = 1024 * 1024;
const ASSET_URL = "/blog-assets/";

type Front = {
  title: string;
  date: string;
  updated?: string;
  authors: string[];
  tags: string[];
  categories: string[];
  draft?: boolean;
  archived?: boolean;
  cover?: string;
};

const errors: string[] = [];
const fail = (where: string, msg: string) => errors.push(`${where}: ${msg}`);

function walk(dir: string): string[] {
  let out: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    const p = join(dir, name);
    const st = statSync(p);
    out = st.isDirectory() ? out.concat(walk(p)) : out.concat(p);
  }
  return out;
}

/** `/blog-assets/blog/x/banner.webp` -> problems with that reference, or none. */
function checkAssetRef(where: string, url: string): void {
  if (!url.startsWith(ASSET_URL)) return;
  const rel = url.slice(ASSET_URL.length);
  const segs = rel.split("/");
  if (segs.some((s) => !ASSET_SEGMENT.test(s) || s.includes(".."))) return fail(where, `${url}: not a servable asset path`);
  if (!IMAGE_EXT.has(extname(rel).toLowerCase())) return fail(where, `${url}: only .webp, .png, .jpg are served`);
  try {
    if (!statSync(join(ASSETS, ...segs)).isFile()) fail(where, `${url}: assets/${rel} is not a file`);
  } catch {
    fail(where, `${url}: assets/${rel} does not exist`);
  }
}

// ---- posts -----------------------------------------------------------------
let publishable = 0;
const slugs = new Map<string, string>();
let blogFiles: string[] = [];
try {
  blogFiles = readdirSync(BLOG).sort();
} catch {
  fail("blog/", "directory is missing");
}
for (const file of blogFiles) {
  const where = `blog/${file}`;
  if (file === "README.md") continue;
  if (!file.endsWith(".md")) {
    fail(where, "only posts belong in blog/ -- images go under assets/blog/<slug>/");
    continue;
  }
  const m = POST_FILE.exec(file);
  if (!m) {
    fail(where, "file name must be `YYYY-MM-DD-<lowercase-kebab-slug>.md`");
    continue;
  }
  const [, fileDate, slug] = m as unknown as [string, string, string];
  const path = join(BLOG, file);
  if (statSync(path).size > MAX_POST_BYTES) fail(where, `larger than ${MAX_POST_BYTES / 1024} KB`);
  let data: Front;
  let body: string;
  try {
    ({ data, body } = parseDocument<Front>(readFileSync(path, "utf8"), SCHEMA, where));
  } catch (err) {
    errors.push(err instanceof FrontMatterError ? err.message : `${where}: ${String(err)}`);
    continue;
  }
  if (data.date !== fileDate) fail(where, `front-matter date ${data.date} does not match the file name's ${fileDate}`);
  if (data.updated !== undefined && data.updated < data.date) fail(where, `updated (${data.updated}) is before date (${data.date})`);
  if (data.authors.length === 0) fail(where, "authors must name at least one author");
  if (data.tags.length === 0) fail(where, "tags must have at least one entry");
  for (const t of data.tags) if (!KEBAB.test(t)) fail(where, `tag \`${t}\` must be lowercase kebab-case`);
  if (data.categories.length === 0) fail(where, "categories must have at least one entry");
  for (const c of data.categories) if (!KEBAB.test(c)) fail(where, `category \`${c}\` must be lowercase kebab-case`);
  const draft = data.draft ?? false;
  if (data.cover !== undefined && !data.cover.startsWith("/")) fail(where, "cover must be a same-origin path starting with `/`");
  if (!draft && data.cover === undefined) fail(where, "cover is required for a published post");
  if (data.cover !== undefined) checkAssetRef(where, data.cover);
  if (/^#\s/m.test(body)) fail(where, "the body must not contain a `# ` heading -- `title` is the page's <h1>; start at `##`");
  for (const img of body.matchAll(/!\[[^\]]*\]\(\s*([^)\s]+)/g)) {
    const url = img[1]!;
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(url)) fail(where, `image ${url}: remote images are blocked by the site's CSP -- put it under assets/`);
    else checkAssetRef(where, url);
  }
  const prev = slugs.get(slug);
  if (prev) fail(where, `slug \`${slug}\` is already used by ${prev}`);
  slugs.set(slug, where);
  if (!draft && !(data.archived ?? false)) publishable += 1;
}
// No "zero publishable posts" failure here: a drafts-only branch is a valid
// thing to open a pull request with. The site refuses to PUBLISH a commit
// with no publishable post (see README.md, "What happens after merge"),
// and the summary line below says when that would apply.

// ---- assets ----------------------------------------------------------------
for (const path of walk(ASSETS)) {
  const rel = relative(ROOT, path).split(sep).join("/");
  const name = rel.split("/").pop()!;
  if (name === ".gitkeep" || name === "README.md") continue;
  const ext = extname(name).toLowerCase();
  if (ext === ".svg") fail(rel, "SVG is not allowed (it can carry script) -- export WebP or PNG");
  else if (!IMAGE_EXT.has(ext)) fail(rel, "only .webp, .png, .jpg are allowed under assets/");
  if (statSync(path).size > MAX_IMAGE_BYTES) fail(rel, "larger than 1 MB");
  const segs = relative(ASSETS, path).split(sep);
  if (segs.some((s) => !ASSET_SEGMENT.test(s))) fail(rel, "path segments may use only letters, digits, `.`, `_`, `-`, and may not start with a dot");
}

if (errors.length > 0) {
  for (const e of errors) console.error(`::error::${e}`);
  console.error(`validate: FAILED -- ${errors.length} problem(s)`);
  process.exit(1);
}
console.log(`validate: OK -- ${slugs.size} post(s), ${publishable} publishable`);
if (publishable === 0) console.log("validate: note -- zero publishable posts; the site will not publish this commit (it keeps serving the last one that had any)");
