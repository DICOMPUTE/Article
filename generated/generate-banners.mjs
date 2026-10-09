// Deterministic banner generator for DICOMPUTE/Article (issue #17373).
// ImageMagick's internal SVG renderer ignores fill/stroke opacity, so every
// alpha is pre-composited here into a flat color over its backdrop.
const W = 1600, H = 900;
const NAVY = ["#0c0c0e", "#0f172a", "#111827", "#1e1b4b", "#1e293b"];
const INDIGO = ["#4338ca", "#4f46e5", "#6366f1", "#818cf8", "#a5b4fc"];
const hx = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (bg, fg, a) => {
  const [r1, g1, b1] = hx(bg), [r2, g2, b2] = hx(fg);
  const m = (x, y) => Math.round(x * (1 - a) + y * a).toString(16).padStart(2, "0");
  return `#${m(r1, r2)}${m(g1, g2)}${m(b1, b2)}`;
};
const svg = (slug, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<!-- ${slug} banner. Deterministic flat-shape pattern in the DiCompute house palette; alphas pre-composited (house palette: navy bases + indigo accents, cf. console app/blog-skin.css). -->
${body}
</svg>
`;
const wrap = (slug, parts) => Bun.write(`/tmp/banners/${slug}.svg`, svg(slug, parts.join("\n")));

// 1) what-shipped-in-august: diagonal shipping bands, rising brightness.
{
  const base = NAVY[1];
  const parts = [`<rect width="${W}" height="${H}" fill="${base}"/>`];
  const bands = [
    [-420, 0.14, INDIGO[0]], [-240, 0.20, INDIGO[1]], [-60, 0.26, INDIGO[2]],
    [120, 0.32, INDIGO[1]], [300, 0.38, INDIGO[2]], [480, 0.44, INDIGO[3]],
    [660, 0.50, INDIGO[2]], [840, 0.56, INDIGO[4]], [1020, 0.62, INDIGO[3]],
    [1200, 0.68, INDIGO[2]],
  ];
  const blended = bands.map(([a, op, col]) => [a, mix(base, col, op)]);
  for (const [a, col] of blended) {
    const wdt = 120;
    parts.push(`<polygon points="${a},0 ${a + wdt},0 ${a + wdt - H},${H} ${a - H},${H}" fill="${col}"/>`);
  }
  // bright leading edges over the adjacent band color
  parts.push(`<polygon points="300,0 312,0 12,900 0,900" fill="${mix(blended[4][1], INDIGO[4], 0.6)}"/>`);
  parts.push(`<polygon points="660,0 668,0 368,900 360,900" fill="${mix(blended[6][1], INDIGO[4], 0.45)}"/>`);
  // accent dashes along the flow
  for (let i = 0; i < 10; i++) {
    const x = 60 + i * 155, y = 90 + i * 76;
    parts.push(`<rect x="${x}" y="${y}" width="52" height="9" fill="${mix(base, INDIGO[4], 0.5)}" transform="rotate(45 ${x + 26} ${y + 4.5})"/>`);
  }
  for (let gx = 900; gx < W; gx += 175)
    for (let gy = 100; gy < H; gy += 175)
      parts.push(`<circle cx="${gx}" cy="${gy}" r="3" fill="${mix(base, NAVY[4], 0.7)}"/>`);
  await wrap("what-shipped-in-august", parts);
}

// 2) leaving-sqlite-one-store-at-a-time: node lattice with an accent migration path.
{
  const base = NAVY[2];
  const parts = [`<rect width="${W}" height="${H}" fill="${base}"/>`];
  const cols = 13, rows = 7, sx = 120, sy = 125, x0 = 80, y0 = 80;
  for (let c = 0; c < cols; c++)
    for (let r = 0; r < rows; r++) {
      const x = x0 + c * sx, y = y0 + r * sy;
      if (c + 1 < cols) parts.push(`<line x1="${x}" y1="${y}" x2="${x + sx}" y2="${y}" stroke="${mix(base, INDIGO[0], 0.30 * (1 - c / cols))}" stroke-width="2"/>`);
      if (r + 1 < rows) parts.push(`<line x1="${x}" y1="${y}" x2="${x}" y2="${y + sy}" stroke="${mix(base, INDIGO[0], 0.22 * (1 - c / cols))}" stroke-width="2"/>`);
    }
  const path = [[1, 3], [3, 2], [5, 4], [7, 1], [9, 3], [11, 2], [12, 3]];
  for (let i = 0; i < path.length - 1; i++) {
    const [c1, r1] = path[i], [c2, r2] = path[i + 1];
    parts.push(`<line x1="${x0 + c1 * sx}" y1="${y0 + r1 * sy}" x2="${x0 + c2 * sx}" y2="${y0 + r2 * sy}" stroke="${mix(base, INDIGO[3], 0.9)}" stroke-width="5"/>`);
  }
  for (let c = 0; c < cols; c++)
    for (let r = 0; r < rows; r++) {
      const x = x0 + c * sx, y = y0 + r * sy;
      if (path.some(([pc, pr]) => pc === c && pr === r)) {
        const col = mix(base, INDIGO[3], 0.95);
        parts.push(`<circle cx="${x}" cy="${y}" r="${(9 + c * 0.8).toFixed(1)}" fill="${col}"/>`);
        parts.push(`<circle cx="${x}" cy="${y}" r="${(18 + c).toFixed(0)}" fill="none" stroke="${mix(base, INDIGO[3], 0.4)}" stroke-width="2"/>`);
      } else {
        parts.push(`<circle cx="${x}" cy="${y}" r="${(4 + c * 0.5).toFixed(1)}" fill="${mix(base, INDIGO[1], 0.25 + 0.55 * c / cols)}"/>`);
      }
    }
  await wrap("leaving-sqlite-one-store-at-a-time", parts);
}

// 3) a-video-landing-under-a-self-only-csp: broadcast rings from a self-contained core.
{
  const base = NAVY[0];
  const parts = [`<rect width="${W}" height="${H}" fill="${base}"/>`];
  const cx = 1180, cy = 260;
  for (let i = 9; i >= 1; i--) {
    const rad = i * 95;
    parts.push(`<circle cx="${cx}" cy="${cy}" r="${rad}" fill="none" stroke="${mix(base, i % 2 ? INDIGO[1] : INDIGO[2], 0.55 - i * 0.045)}" stroke-width="${i === 1 ? 6 : 3}"/>`);
  }
  for (let i = 1; i <= 4; i++)
    parts.push(`<circle cx="120" cy="830" r="${i * 110}" fill="none" stroke="${mix(base, INDIGO[0], 0.5 - i * 0.09)}" stroke-width="4"/>`);
  const core = mix(base, INDIGO[2], 0.95);
  parts.push(`<circle cx="${cx}" cy="${cy}" r="70" fill="${core}"/>`);
  parts.push(`<circle cx="${cx}" cy="${cy}" r="95" fill="none" stroke="${mix(base, INDIGO[4], 0.6)}" stroke-width="5"/>`);
  for (let i = 0; i < 4; i++) {
    const h = 18 + i * 14;
    parts.push(`<rect x="${cx - 42 + i * 24}" y="${cy + 34 - h}" width="12" height="${h}" fill="${mix(core, NAVY[0], 0.85)}"/>`);
  }
  for (let y = 40; y < H; y += 90)
    parts.push(`<rect x="0" y="${y}" width="${W}" height="2" fill="${mix(base, NAVY[4], 0.35)}"/>`);
  await wrap("a-video-landing-under-a-self-only-csp", parts);
}
