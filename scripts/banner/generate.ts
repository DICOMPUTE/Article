#!/usr/bin/env bun
// Editorial banner generator (engine A: procedural seeded raster -> duotone +
// grain -> WebP). Run locally with `bun scripts/banner/generate.ts` and in CI
// by .github/workflows/banner.yml when a pull request adds or edits a post
// that has no banner. See docs/banner-style.md for the house style this
// enforces and README.md ("Banner generation") for the pipeline contract.
//
// Design constraints, all enforced here rather than suggested:
//   - 1600x900 (16:9) WebP, at most 300 KB.
//   - The generator never draws text, letters, numbers, logos or UI chrome,
//     so no OCR pass is needed: there is no glyph renderer in this file.
//   - No people, hands, faces, robots, brains, padlocks, coins, neon grids,
//     lens flare or 3D gloss -- only flat analytic shapes (SDFs), posterised
//     onto a limited duotone palette with one accent per category.
//   - One clear focal motif, right of centre, inside the upper 60%; the
//     lower 40% stays calm and dark so the white hero title clears 4.5:1.
//   - Fully reproducible: the seed is sha256(slug + suffix); the brief, the
//     engine version and the seed are recorded in banner.generated.json.
//   - A human banner always wins: banner.webp without banner.generated.json
//     beside it is never touched (unless --force is given explicitly).
//
// Exit code is 0 even when individual posts are skipped or fail, so CI never
// blocks a post; the per-post outcome is printed as `banner: <slug>: …`.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { deflateSync } from "node:zlib";
import { parseDocument, type Schema } from "../frontmatter";

// ---- palette (RACK/brand tokens, see docs/banner-style.md) ------------------

const INK_DEEP: RGB = [6, 9, 20]; // #060914 -- darker than RACK --color-bg so white title text clears 4.5:1
const INK_MID: RGB = [17, 26, 51]; // #111A33 -- RACK --color-bg-elevated
const INK_SOFT: RGB = [36, 52, 96]; // hand-tuned step between elevated and paper
const PAPER: RGB = [247, 246, 242]; // #F7F6F2 -- RACK light paper
const ACCENT_DEFAULT: RGB = [138, 168, 255]; // #8AA8FF -- RACK --color-accent-text

/** One accent per category, all taken from the RACK token set. An unknown
 *  category falls back to the brand blue -- never to a colour outside the
 *  brand palette. */
const ACCENT_BY_CATEGORY: Record<string, { rgb: RGB; name: string }> = {
  engineering: { rgb: [77, 231, 255], name: "cyan" }, // #4de7ff -- chart series 1
  security: { rgb: [44, 224, 167], name: "mint" }, // #2ce0a7 -- success
  product: { rgb: [240, 146, 73], name: "amber" }, // #f09249 -- warning
  research: { rgb: [192, 132, 252], name: "violet" }, // #c084fc -- chart series 3
  company: { rgb: [232, 92, 97], name: "red" }, // #e85c61 -- danger
  design: { rgb: [157, 185, 255], name: "pale blue" }, // #9DB9FF -- m-code-accent
};

// ---- geometry ----------------------------------------------------------------

type RGB = [number, number, number];
type V = { x: number; y: number };
/** 16:9 canvas in aspect-corrected units (x in [0, 16/9], y in [0, 1]) so a
 *  unit is a square pixel step. */
const W = 1600;
const H = 900;
const AX = W / H;
const MAX_BYTES = 300 * 1024;
const LOWER_BAND_START = 0.6; // the lower 40% stays shape-free

type Layer = {
  /** Signed distance to the shape's edge; negative inside. */
  d: (p: V) => number;
  /** Luminance target 0..1 on the duotone ramp (ignored for accent layers). */
  lum: number;
  /** Accent layers paint the category accent instead of the ramp. */
  accent?: boolean;
  /** Edge softness in canvas units. */
  feather: number;
  /** Optional soft gate (0..1) multiplied into the mask -- used to keep a
   *  shape clear of the left ~40% without a hard cut. */
  mask?: (p: V) => number;
};

// ---- tiny SDF toolkit ---------------------------------------------------------

const len = (p: V) => Math.hypot(p.x, p.y);
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function sdCircle(c: V, r: number): (p: V) => number {
  return (p) => len({ x: p.x - c.x, y: p.y - c.y }) - r;
}

function sdRing(c: V, r: number, t: number): (p: V) => number {
  return (p) => Math.abs(len({ x: p.x - c.x, y: p.y - c.y }) - r) - t;
}

/** Rounded rectangle, half-extents h, corner radius rad. */
function sdRBox(c: V, h: V, rad: number): (p: V) => number {
  return (p) => {
    const q = { x: Math.abs(p.x - c.x) - h.x + rad, y: Math.abs(p.y - c.y) - h.y + rad };
    return Math.min(Math.max(q.x, q.y), 0) + len({ x: Math.max(q.x, 0), y: Math.max(q.y, 0) }) - rad;
  };
}

/** Rounded-rectangle outline of thickness t. */
function sdRBoxRing(c: V, h: V, rad: number, t: number): (p: V) => number {
  const box = sdRBox(c, h, rad);
  return (p) => Math.abs(box(p)) - t;
}

/** Capsule: segment a->b thickened by r. */
function sdCapsule(a: V, b: V, r: number): (p: V) => number {
  return (p) => {
    const ab = { x: b.x - a.x, y: b.y - a.y };
    const t = Math.min(1, Math.max(0, ((p.x - a.x) * ab.x + (p.y - a.y) * ab.y) / (ab.x * ab.x + ab.y * ab.y)));
    return len({ x: p.x - (a.x + ab.x * t), y: p.y - (a.y + ab.y * t) }) - r;
  };
}

/** Ring squeezed by a rotation matrix -- an orbit ellipse. */
function sdOrbit(c: V, r: number, t: number, tilt: number, squeeze: number): (p: V) => number {
  const cos = Math.cos(tilt);
  const sin = Math.sin(tilt);
  return (p) => {
    const dx = p.x - c.x;
    const dy = p.y - c.y;
    const q = { x: (dx * cos + dy * sin) / squeeze, y: -dx * sin + dy * cos };
    return Math.abs(len(q) - r) - t;
  };
}

/** Wavy band: points within t of y = base + amp * sin(freq * x + phase). */
function sdWave(base: number, amp: number, freq: number, phase: number, t: number): (p: V) => number {
  return (p) => Math.abs(p.y - (base + amp * Math.sin(freq * p.x + phase))) - t;
}

// ---- deterministic PRNG -------------------------------------------------------

type Rng = () => number;

function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function slugSeed(slug: string, suffix: string): number {
  const hex = createHash("sha256").update(`article-banner/v1\n${slug}\n${suffix}`).digest("hex");
  return parseInt(hex.slice(0, 8), 16);
}

// ---- motif library -------------------------------------------------------------
//
// One concrete visual metaphor per post, chosen by keyword match against the
// post's own words (title, description, tags, categories, ## headings, first
// paragraph). No motif is a literal picture of "AI / GPU / blockchain"; each
// returns flat SDF layers and a factual alt-text phrase.

type Motif = {
  id: string;
  keywords: string[];
  /** Factual phrase used in coverAlt; the accent colour name is appended. */
  alt: string;
  build: (rng: Rng, accent: boolean) => Layer[];
};

const MOTIFS: Motif[] = [
  {
    id: "containers",
    keywords: ["sqlite", "postgres", "database", "store", "storage", "migration", "migrate", "move", "moveing", "schema", "sql"],
    alt: "a row of small containers, one lifted clear of its slot and picked out in accent",
    build: (rng) => {
      const n = 5;
      const lifted = Math.floor(rng() * n);
      const w = 0.075;
      const h = 0.11;
      const gap = 0.025;
      const unit = w * 2 + gap;
      const row = n * unit - gap;
      // Keep the whole row right of the left ~40% with a calm right margin.
      const x0 = 0.78 + (AX - 0.15 - 0.78 - row) / 2 + w;
      const layers: Layer[] = [];
      for (let i = 0; i < n; i++) {
        const up = i === lifted ? 0.075 : 0;
        layers.push({
          d: sdRBox({ x: x0 + i * unit, y: 0.40 - up }, { x: w, y: h }, 0.022),
          lum: i === lifted ? 1.0 : 0.82,
          feather: 0.004,
        });
      }
      const lx = x0 + lifted * unit;
      layers.push({
        d: sdRBoxRing({ x: lx, y: 0.40 - 0.075 }, { x: w + 0.014, y: h + 0.014 }, 0.03, 0.007),
        lum: 0,
        accent: true,
        feather: 0.003,
      });
      return layers;
    },
  },
  {
    id: "ledger-ticks",
    keywords: ["ledger", "billing", "bill", "money", "settlement", "invoice", "balance", "payment", "payout", "audit"],
    alt: "ruled ledger lines crossed by small tally groups, one group picked out in accent",
    build: (rng) => {
      const layers: Layer[] = [];
      const x0 = 0.95;
      const x1 = 1.62;
      for (let i = 0; i < 4; i++) {
        const y = 0.17 + i * 0.13;
        layers.push({ d: sdCapsule({ x: x0, y }, { x: x1, y }, 0.004), lum: 0.55, feather: 0.002 });
        let x = x0 + 0.05 + rng() * 0.05;
        while (x < x1 - 0.08) {
          const groupAccent = rng() < 0.18;
          for (let g = 0; g < 5 && x < x1 - 0.03; g++, x += 0.035) {
            layers.push({
              d: sdCapsule({ x, y: y - 0.035 }, { x, y: y + 0.035 }, 0.0045),
              lum: groupAccent ? 0 : 0.85,
              accent: groupAccent,
              feather: 0.002,
            });
          }
          x += 0.03 + rng() * 0.05;
        }
      }
      return layers;
    },
  },
  {
    id: "steps",
    keywords: ["shipped", "ship", "shipping", "launch", "growth", "milestone", "changelog", "progress", "august", "month", "recap"],
    alt: "four ascending steps, the highest picked out in accent",
    build: (rng) => {
      const n = 4;
      const bw = 0.14 + rng() * 0.02;
      const gap = 0.04 + rng() * 0.02;
      const x0 = 0.95 + rng() * 0.08;
      const baseY = 0.58;
      const jitter = () => (rng() - 0.5) * 0.03;
      const layers: Layer[] = [];
      for (let i = 0; i < n; i++) {
        const hh = 0.08 + i * 0.08 + jitter();
        layers.push({
          d: sdRBox({ x: x0 + i * (bw + gap), y: baseY - hh }, { x: bw / 2, y: hh }, 0.015),
          lum: i === n - 1 ? 0 : 0.5 + i * 0.16,
          accent: i === n - 1,
          feather: 0.004,
        });
      }
      return layers;
    },
  },
  {
    id: "rings",
    keywords: ["network", "federation", "federated", "sync", "node", "peer", "mesh", "relay", "coordinator"],
    alt: "two offset rings with a single accent dot on the outer ring",
    build: (rng) => {
      const c1 = { x: 1.05, y: 0.3 };
      const c2 = { x: 1.33 + rng() * 0.06, y: 0.28 };
      const r1 = 0.24;
      const ang = rng() * Math.PI * 2;
      return [
        { d: sdRing(c1, r1, 0.011), lum: 0.9, feather: 0.003 },
        { d: sdRing(c2, 0.15, 0.01), lum: 0.5, feather: 0.003 },
        { d: sdCircle({ x: c1.x + Math.cos(ang) * r1, y: c1.y + Math.sin(ang) * r1 }, 0.024), lum: 0, accent: true, feather: 0.003 },
      ];
    },
  },
  {
    id: "waves",
    keywords: ["video", "stream", "watch", "landing", "page", "wave", "signal", "audio", "frame", "render"],
    alt: "three flowing bands crossing the upper frame, the middle one picked out in accent",
    build: (rng) => {
      const freq = 2.2 + rng() * 1.2;
      const phase = rng() * Math.PI * 2;
      const keepRight = (p: V) => smooth(0.62, 0.78, p.x);
      return [0, 1, 2].map((i) => ({
        d: sdWave(0.22 + i * 0.1, 0.045, freq, phase + i * 0.7, i === 1 ? 0.016 : 0.011),
        lum: i === 1 ? 0 : 0.7,
        accent: i === 1,
        feather: 0.003,
        mask: keepRight,
      }));
    },
  },
  {
    id: "arch",
    keywords: ["security", "csp", "auth", "permission", "access", "key", "gate", "guard", "attack", "vulnerability"],
    alt: "a rounded gateway arch drawn in outline, a single accent block resting on its crown",
    build: () => {
      const c = { x: 1.25, y: 0.34 };
      const half = { x: 0.2, y: 0.22 };
      return [
        { d: sdRBox(c, { x: half.x + 0.014, y: half.y + 0.014 }, 0.14), lum: 0.9, feather: 0.003 },
        { d: sdRBox(c, half, 0.125), lum: 0.08, feather: 0.003 },
        { d: sdRBox({ x: c.x, y: c.y - half.y - 0.035 }, { x: 0.05, y: 0.028 }, 0.012), lum: 0, accent: true, feather: 0.003 },
        { d: sdCapsule({ x: 1.0, y: 0.62 }, { x: 1.5, y: 0.62 }, 0.005), lum: 0.4, feather: 0.002 },
      ];
    },
  },
  {
    id: "scatter-to-grid",
    keywords: ["agent", "swarm", "parallel", "worker", "fleet", "queue", "task", "batch", "coordinate", "scheduler", "dispatch"],
    alt: "scattered dots settling into a tidy grid, one dot mid-journey picked out in accent",
    build: (rng) => {
      const layers: Layer[] = [];
      const accentIdx = Math.floor(rng() * 12);
      for (let i = 0; i < 12; i++) {
        const gx = 1.28 + (i % 4) * 0.115;
        const gy = 0.19 + Math.floor(i / 4) * 0.115;
        const sx = 0.86 + rng() * 0.2;
        const sy = 0.16 + rng() * 0.4;
        const t = rng();
        const x = sx * (1 - t) + gx * t;
        const y = sy * (1 - t) + gy * t;
        layers.push({ d: sdCircle({ x, y }, 0.021), lum: 0.9, accent: i === accentIdx, feather: 0.003 });
      }
      return layers;
    },
  },
  {
    id: "layers",
    keywords: ["architecture", "stack", "layer", "protocol", "pipeline", "infra", "service", "deploy"],
    alt: "three stacked offset layers seen at an angle, the top face picked out in accent",
    build: (rng) => {
      const cx = 1.22 + rng() * 0.05;
      const cy = 0.3;
      const s = 0.16;
      const skew = 0.09;
      const rot = (c: V, k: number): V => ({ x: c.x + k * skew, y: c.y - k * 0.055 });
      const diamond = (c: V): ((p: V) => number) => (p) => {
        const q = { x: Math.abs(p.x - c.x), y: Math.abs(p.y - c.y) };
        return (q.x / s + q.y / (s * 0.55)) / 2 - 0.5;
      };
      return [
        { d: diamond(rot({ x: cx, y: cy }, 0)), lum: 0.35, feather: 0.004 },
        { d: diamond(rot({ x: cx, y: cy }, 1)), lum: 0.6, feather: 0.004 },
        { d: diamond(rot({ x: cx, y: cy }, 2)), lum: 0, accent: true, feather: 0.004 },
      ];
    },
  },
  {
    id: "branch",
    keywords: ["router", "routing", "route", "decision", "choose", "fork", "path", "split", "strategy"],
    alt: "a single path splitting in two at a small accent node",
    build: (rng) => {
      const fork = { x: 1.12 + rng() * 0.08, y: 0.34 };
      const a1 = { x: fork.x + 0.28, y: 0.14 };
      const a2 = { x: fork.x + 0.3, y: 0.52 };
      return [
        { d: sdCapsule({ x: 0.78, y: 0.44 }, fork, 0.012), lum: 0.75, feather: 0.003 },
        { d: sdCapsule(fork, a1, 0.012), lum: 0.55, feather: 0.003 },
        { d: sdCapsule(fork, a2, 0.012), lum: 0.55, feather: 0.003 },
        { d: sdCircle(fork, 0.026), lum: 0, accent: true, feather: 0.003 },
      ];
    },
  },
  {
    id: "orbit",
    keywords: ["model", "inference", "orbit", "compute", "gpu", "cluster", "tensor", "train"],
    alt: "a tilted orbit ring around a solid point, with a second point travelling the ring, picked out in accent",
    build: (rng) => {
      const c = { x: 1.22, y: 0.3 };
      const tilt = 0.5 + rng() * 0.5;
      const ang = rng() * Math.PI * 2;
      const r = 0.26;
      const cos = Math.cos(tilt);
      const sin = Math.sin(tilt);
      const onOrbit = (a: number): V => {
        const q = { x: Math.cos(a) * r * 0.62, y: Math.sin(a) * r };
        return { x: c.x + q.x * cos - q.y * sin, y: c.y + q.x * sin + q.y * cos };
      };
      return [
        { d: sdCircle(c, 0.05), lum: 0.95, feather: 0.003 },
        { d: sdOrbit(c, r, 0.009, tilt, 0.62), lum: 0.6, feather: 0.003 },
        { d: sdCircle(onOrbit(ang), 0.026), lum: 0, accent: true, feather: 0.003 },
      ];
    },
  },
];

// ---- brief --------------------------------------------------------------------

type Brief = {
  motif: Motif;
  matched: string[];
  accent: { rgb: RGB; name: string; category: string };
};

function buildBrief(slug: string, data: { title: string; description: string; tags: string[]; categories: string[] }, body: string): Brief {
  const headings = [...body.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1]!.toLowerCase());
  const firstParagraph = body
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .find((s) => s.length > 0 && !s.startsWith("#"));
  const haystack = `${data.title} ${data.description} ${data.tags.join(" ")} ${data.categories.join(" ")} ${headings.join(" ")} ${firstParagraph ?? ""}`
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ");
  let best: { motif: Motif; matched: string[] } | null = null;
  for (const motif of MOTIFS) {
    const matched = motif.keywords.filter((k) => haystack.includes(k));
    if (matched.length > 0 && (best === null || matched.length > best.matched.length)) best = { motif, matched };
  }
  const motif = best?.motif ?? MOTIFS[slugSeed(slug, "motif") % MOTIFS.length]!;
  const category = data.categories[0] ?? "";
  const accent = ACCENT_BY_CATEGORY[category] ?? { rgb: ACCENT_DEFAULT, name: "blue" };
  return { motif, matched: best?.matched ?? [], accent: { ...accent, category } };
}

// ---- renderer -------------------------------------------------------------------

function ramp(t: number): RGB {
  const stops: [number, RGB][] = [
    [0, INK_DEEP],
    [0.42, INK_MID],
    [0.78, INK_SOFT],
    [1, PAPER],
  ];
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i]![0]) {
      const [t0, c0] = stops[i - 1]!;
      const [t1, c1] = stops[i]!;
      const k = (t - t0) / (t1 - t0);
      return [c0[0] + (c1[0] - c0[0]) * k, c0[1] + (c1[1] - c0[1]) * k, c0[2] + (c1[2] - c0[2]) * k];
    }
  }
  return PAPER;
}

/** Paints the composition into an RGBA-less RGB buffer and returns it plus
 *  the measured contrast of the lower band against pure white. */
function render(seed: number, brief: Brief): { rgb: Uint8Array; lowerContrast: number } {
  const rng = mulberry32(seed);
  const layers = brief.motif.build(rng, true);
  // Sparse secondary marks on the left, kept small so the left ~40% and the
  // whole lower band stay calm (README's banner rule + the hero-title rule).
  const decoCount = 2 + Math.floor(rng() * 2);
  for (let i = 0; i < decoCount; i++) {
    const dot = rng() < 0.7;
    if (dot) {
      layers.push({
        d: sdCircle({ x: 0.14 + rng() * 0.24, y: 0.12 + rng() * 0.3 }, 0.008 + rng() * 0.008),
        lum: 0.5 + rng() * 0.4,
        feather: 0.002,
      });
    } else {
      const x = 0.12 + rng() * 0.2;
      const y = 0.15 + rng() * 0.28;
      const a = rng() * Math.PI;
      const l = 0.05 + rng() * 0.06;
      layers.push({
        d: sdCapsule({ x, y }, { x: x + Math.cos(a) * l, y: y + Math.sin(a) * l }, 0.004),
        lum: 0.45,
        feather: 0.002,
      });
    }
  }
  const rgb = new Uint8Array(W * H * 3);
  const [ar, ag, ab] = brief.accent.rgb;
  // Lower-band accumulation for the contrast check.
  let lowerLumSum = 0;
  let lowerCount = 0;
  for (let py = 0; py < H; py++) {
    const y = py / H;
    // Base: a hair lighter at the top, pinned to ink-deep from 60% down.
    let lum = y < LOWER_BAND_START ? 0.3 * (1 - smooth(0.05, LOWER_BAND_START, y)) + 0.06 : 0.05;
    let accentMask = 0;
    const p = { x: 0, y };
    const row = py * W * 3;
    for (let px = 0; px < W; px++) {
      p.x = (px / W) * AX;
      let l = lum;
      let am = accentMask;
      for (const layer of layers) {
        // Cheap reject: skip shapes far outside the pixel's neighbourhood.
        const sd = layer.d(p);
        if (sd > layer.feather * 2) continue;
        let m = smooth(layer.feather, -layer.feather, sd);
        if (layer.mask !== undefined) m *= layer.mask(p);
        if (m < 0.004) continue;
        if (layer.accent) am = Math.max(am, m);
        else l = l * (1 - m) + layer.lum * m;
      }
      // Uniform film grain, ~±4% -- the risograph texture that keeps the
      // flat duotone from reading as a glossy digital gradient.
      const g = (rng() - 0.5) * 0.08;
      l = Math.min(1, Math.max(0, l + g));
      let [r, gg, b] = ramp(l);
      if (am > 0) {
        const k = am * 0.92;
        r = r * (1 - k) + ar * k;
        gg = gg * (1 - k) + ag * k;
        b = b * (1 - k) + ab * k;
      }
      const i = row + px * 3;
      rgb[i] = r;
      rgb[i + 1] = gg;
      rgb[i + 2] = b;
      if (y >= LOWER_BAND_START) {
        lowerLumSum += relativeLuminance(r, gg, b);
        lowerCount++;
      }
    }
  }
  const meanLum = lowerLumSum / lowerCount;
  const contrast = 1.05 / (meanLum + 0.05);
  return { rgb, lowerContrast: contrast };
}

function relativeLuminance(r: number, g: number, b: number): number {
  const f = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

// ---- minimal PNG encoder (no dependencies) --------------------------------------

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]!) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function encodePng(rgb: Uint8Array): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour RGB
  const stride = W * 3;
  const raw = Buffer.alloc((stride + 1) * H);
  for (let y = 0; y < H; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    Buffer.from(rgb.buffer, rgb.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---- WebP encoding ----------------------------------------------------------------

function findEncoder(): { cmd: string; args: (q: number, input: string, output: string) => string[] } {
  const tryCmd = (cmd: string): boolean => {
    try {
      execFileSync(cmd, ["-version"], { stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  };
  const want = process.env.BANNER_WEBP_ENCODER;
  if (want === "cwebp" || (!want && tryCmd("cwebp"))) {
    return { cmd: "cwebp", args: (q, input, output) => ["-quiet", "-q", String(q), "-mt", "-o", output, input] };
  }
  if (want === "convert" || (!want && tryCmd("convert"))) {
    return { cmd: "convert", args: (q, input, output) => [input, "-quality", String(q), output] };
  }
  throw new Error("no WebP encoder found -- install cwebp (apt package: webp) or ImageMagick, or set BANNER_WEBP_ENCODER=cwebp|convert");
}

// ---- front matter -----------------------------------------------------------------

const GEN_SCHEMA: Schema = {
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
  coverAlt: { type: "string" },
};

/** Sets `cover` to the generated banner and adds `coverAlt` when absent,
 *  preserving every other byte of the file. A pre-existing coverAlt (human
 *  or previously generated) always wins. */
function updatePostFrontMatter(source: string, slug: string, coverAlt: string): string {
  const lines = source.split("\n");
  if (lines[0]?.trim() !== "---") throw new Error("post has no front-matter block");
  let fence = -1;
  for (let i = 1; i < lines.length; i++) {
    if (/^---\s*$/.test(lines[i]!)) {
      fence = i;
      break;
    }
  }
  if (fence < 0) throw new Error("front-matter block is never closed");
  const fm = lines.slice(0, fence + 1);
  let coverIdx = -1;
  let coverAltIdx = -1;
  for (let i = 1; i < fence; i++) {
    if (/^cover:/.test(lines[i]!)) coverIdx = i;
    if (/^coverAlt:/.test(lines[i]!)) coverAltIdx = i;
  }
  const coverLine = `cover: /blog-assets/blog/${slug}/banner.webp`;
  const altLine = `coverAlt: "${coverAlt.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  if (coverAltIdx >= 0) {
    // Keep the existing coverAlt; only point cover at the generated banner.
    if (coverIdx >= 0) fm[coverIdx] = coverLine;
    else fm.splice(fence, 0, coverLine);
    return [...fm, ...lines.slice(fence + 1)].join("\n");
  }
  if (coverIdx >= 0) {
    fm[coverIdx] = coverLine;
    fm.splice(coverIdx + 1, 0, altLine);
  } else {
    fm.splice(fence, 0, coverLine, altLine);
  }
  return [...fm, ...lines.slice(fence + 1)].join("\n");
}

// ---- driver ------------------------------------------------------------------------

type Outcome = { slug: string; status: "generated" | "kept-human" | "already" | "failed"; detail: string };

function generateOne(root: string, file: string, opts: { force: boolean; seedSuffix: string }): Outcome {
  const m = /^(\d{4}-\d{2}-\d{2})-([a-z0-9]+(?:-[a-z0-9]+)*)\.md$/.exec(file);
  if (!m) return { slug: file, status: "failed", detail: "file name is not a post" };
  const slug = m[2]!;
  const postPath = join(root, "blog", file);
  const assetDir = join(root, "assets", "blog", slug);
  const bannerPath = join(assetDir, "banner.webp");
  const metaPath = join(assetDir, "banner.generated.json");
  const hasBanner = existsSync(bannerPath);
  const hasMeta = existsSync(metaPath);
  if (hasBanner && !hasMeta && !opts.force) {
    return { slug, status: "kept-human", detail: "banner.webp without banner.generated.json -- a human image always wins" };
  }
  if (hasBanner && hasMeta && !opts.force && opts.seedSuffix === "") {
    return { slug, status: "already", detail: "generated banner exists; use --force or --seed-suffix to regenerate" };
  }

  const source = readFileSync(postPath, "utf8");
  const { data, body } = parseDocument<{
    title: string;
    description: string;
    tags: string[];
    categories: string[];
  }>(source, GEN_SCHEMA, file);
  const brief = buildBrief(slug, data, body);
  const article = /^[aeiou]/i.test(brief.accent.name) ? "an" : "a";
  const coverAlt = `Duotone editorial illustration: ${brief.motif.alt}; ${article} ${brief.accent.name} accent on a deep ink field.`;

  const tmp = mkdtempSync(join(tmpdir(), "article-banner-"));
  try {
    const encoder = findEncoder();
    let lastErr: Error | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      const suffix = attempt === 0 ? opts.seedSuffix : `${opts.seedSuffix}-retry${attempt}`;
      const seed = slugSeed(slug, suffix);
      try {
        const { rgb, lowerContrast } = render(seed, brief);
        if (lowerContrast < 4.5) {
          throw new Error(`lower 40% contrast vs #fff is ${lowerContrast.toFixed(2)}:1 (< 4.5:1)`);
        }
        const pngPath = join(tmp, `${slug}.png`);
        writeFileSync(pngPath, encodePng(rgb));
        mkdirSync(assetDir, { recursive: true });
        let bytes = Infinity;
        for (const q of [82, 74, 66, 58, 50]) {
          execFileSync(encoder.cmd, encoder.args(q, pngPath, bannerPath));
          bytes = statSync(bannerPath).size;
          if (bytes <= MAX_BYTES) break;
        }
        if (bytes > MAX_BYTES) throw new Error(`banner.webp is ${bytes} bytes (> ${MAX_BYTES}) even at minimum quality`);
        writeFileSync(
          metaPath,
          JSON.stringify(
            {
              engine: "article-banner/1",
              generator: "scripts/banner/generate.ts",
              seed,
              seedSuffix: suffix,
              generatedAt: new Date().toISOString(),
              brief: {
                title: data.title,
                motif: brief.motif.id,
                motifMatched: brief.matched,
                accentCategory: brief.accent.category,
                accent: `#${brief.accent.rgb.map((v) => v.toString(16).padStart(2, "0")).join("")}`,
                composition: "one focal motif right of centre in the upper 60%, calm lower 40%, flat duotone with uniform film grain",
              },
              checks: {
                width: W,
                height: H,
                bytes,
                maxBytes: MAX_BYTES,
                lower40ContrastVsWhite: `${lowerContrast.toFixed(2)}:1`,
                ocr: "not applicable -- engine A renders no text layers",
              },
            },
            null,
            2,
          ) + "\n",
        );
        const updated = updatePostFrontMatter(source, slug, coverAlt);
        if (updated !== source) writeFileSync(postPath, updated);
        return { slug, status: "generated", detail: `motif=${brief.motif.id} accent=${brief.accent.name} seed=${seed} ${bytes} bytes, lower40 ${lowerContrast.toFixed(1)}:1` };
      } catch (err) {
        lastErr = err instanceof Error ? err : new Error(String(err));
      }
    }
    return { slug, status: "failed", detail: lastErr?.message ?? "unknown error" };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

function main(): void {
  const args = process.argv.slice(2);
  const opts = { force: false, seedSuffix: "" };
  let root = process.cwd();
  let slugs: string[] | null = null;
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === "--root") root = resolve(args[++i]!);
    else if (a === "--slugs") slugs = args[++i]!.split(",").map((s) => s.trim()).filter(Boolean);
    else if (a === "--force") opts.force = true;
    else if (a === "--seed-suffix") opts.seedSuffix = args[++i] ?? "";
    else if (a === "--all") slugs = null;
    else root = resolve(a);
  }
  const blogDir = join(root, "blog");
  let all: string[] = [];
  try {
    all = readdirSync(blogDir);
  } catch {
    console.log("banner: blog/ directory is missing");
    return;
  }
  const files = all
    .filter((f) => f.endsWith(".md") && f !== "README.md")
    .filter((f) => slugs === null || slugs.some((s) => f.endsWith(`-${s}.md`)));
  if (files.length === 0) {
    console.log("banner: no matching posts");
    return;
  }
  const outcomes: Outcome[] = [];
  for (const file of files) outcomes.push(generateOne(root, file, opts));
  for (const o of outcomes) console.log(`banner: ${o.slug}: ${o.status} -- ${o.detail}`);
  const failed = outcomes.filter((o) => o.status === "failed");
  if (failed.length > 0) console.log(`banner: ${failed.length} post(s) failed -- the post ships without a banner and the site's gradient fallback serves instead`);
}

main();
