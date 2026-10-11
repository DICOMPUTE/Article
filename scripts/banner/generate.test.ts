// Hermetic test of the banner generator CLI: a stub `cwebp` on PATH stands in
// for the real encoder, so no apt package or ImageMagick is needed.
import { afterAll, beforeAll, expect, test } from "bun:test";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const GENERATE = join(import.meta.dir, "generate.ts");
const POST = `---
title: "A test post"
description: "A fixture post used to exercise the banner generator."
date: 2026-09-02
authors: [DiCompute team]
tags: [test]
categories: [product]
---

Body text.
`;

let root: string;
let bin: string;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "banner-test-root-"));
  bin = mkdtempSync(join(tmpdir(), "banner-test-bin-"));
  mkdirSync(join(root, "blog"));
  writeFileSync(join(root, "blog", "2026-09-02-a-test-post.md"), POST);
  // cwebp stub: args are -quiet -q N -mt -o OUTPUT INPUT. Emit a tiny file.
  writeFileSync(join(bin, "cwebp"), '#!/bin/sh\nwhile [ "$1" != "-o" ]; do shift; done\nprintf RIFFstub > "$2"\n');
  chmodSync(join(bin, "cwebp"), 0o755);
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
  rmSync(bin, { recursive: true, force: true });
});

function run(...args: string[]): string {
  const r = Bun.spawnSync(["bun", GENERATE, "--root", root, ...args], {
    env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, BANNER_WEBP_ENCODER: "cwebp" },
  });
  expect(r.exitCode).toBe(0);
  return r.stdout.toString();
}

test("generates a banner, metadata and cover front matter, then is idempotent", () => {
  const out = run("--slugs", "a-test-post");
  expect(out).toContain("a-test-post: generated");
  const dir = join(root, "assets", "blog", "a-test-post");
  expect(existsSync(join(dir, "banner.webp"))).toBe(true);
  expect(existsSync(join(dir, "banner.generated.json"))).toBe(true);
  const post = readFileSync(join(root, "blog", "2026-09-02-a-test-post.md"), "utf8");
  expect(post).toContain("cover:");
  expect(post).toContain("coverAlt:");
  expect(run("--slugs", "a-test-post")).toContain("a-test-post: already");
}, 60_000);

test("reports no matching posts for an unknown slug", () => {
  expect(run("--slugs", "nope")).toContain("no matching posts");
});
