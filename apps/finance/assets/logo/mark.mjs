// Source of the app logo: a three-segment donut whose opening on the right makes it a "C" (cadence) — the
// Insights spending donut reduced to its essentials. Brass (the accent) leads, ivory (the text colour) and mint
// (the income colour) follow, on a deep emerald field.
// `render.mjs` writes these SVGs next to this file and renders them to the PNGs app.json points at.

const FIELD = { top: "#17604B", mid: "#0C3E30", base: "#05231B" };

/** Segments clockwise from the lower terminal of the C. `w` is the share of the ring; `c` is [light, deep]. */
const SEGMENTS = [
  { w: 0.95, c: ["#A6EBCA", "#4FB989"], gray: "#9A9A9A" }, // mint, bottom
  { w: 0.8, c: ["#FAF6EC", "#D9D0BB"], gray: "#CFCFCF" }, // ivory, left
  { w: 1.35, c: ["#F9E4B2", "#CB9C50"], gray: "#FFFFFF" }, // brass, top
];

/** Ring in the 1024 box at scale 1: radii, the C's opening (degrees either side of 3 o'clock), gaps, corners. */
const RING = { ri: 178, ro: 344, open: 42, gap: 40, cr: 26 };

const rad = (d) => (d * Math.PI) / 180;
const fx = (n) => +n.toFixed(2);
const P = ([x, y]) => `${fx(x)} ${fx(y)}`;
const polar = (cx, cy, r, a) => [
  cx + r * Math.cos(rad(a)),
  cy + r * Math.sin(rad(a)),
];

/**
 * One donut segment from angle a0 to a1 (degrees, clockwise from 3 o'clock) between radii ri and ro, with
 * parallel-sided gaps (`gap` wide, half taken from each end) and every corner rounded to `cr`.
 */
function sector(cx, cy, ri, ro, a0, a1, gap, cr) {
  const d = gap / 2;
  const roC = ro - cr;
  const riC = ri + cr;
  const dO = (Math.asin((d + cr) / roC) * 180) / Math.PI;
  const dI = (Math.asin((d + cr) / riC) * 180) / Math.PI;
  // Point where a corner circle touches the straight gap edge at angle a (side +1 = clockwise of the radius).
  const edge = (a, rho, delta, side) => {
    const along = rho * Math.cos(rad(delta));
    return [
      cx + Math.cos(rad(a)) * along - side * Math.sin(rad(a)) * d,
      cy + Math.sin(rad(a)) * along + side * Math.cos(rad(a)) * d,
    ];
  };
  const largeO = a1 - a0 - 2 * dO > 180 ? 1 : 0;
  const largeI = a1 - a0 - 2 * dI > 180 ? 1 : 0;
  return [
    `M ${P(polar(cx, cy, ro, a0 + dO))}`,
    `A ${fx(ro)} ${fx(ro)} 0 ${largeO} 1 ${P(polar(cx, cy, ro, a1 - dO))}`,
    `A ${fx(cr)} ${fx(cr)} 0 0 1 ${P(edge(a1, roC, dO, -1))}`,
    `L ${P(edge(a1, riC, dI, -1))}`,
    `A ${fx(cr)} ${fx(cr)} 0 0 1 ${P(polar(cx, cy, ri, a1 - dI))}`,
    `A ${fx(ri)} ${fx(ri)} 0 ${largeI} 0 ${P(polar(cx, cy, ri, a0 + dI))}`,
    `A ${fx(cr)} ${fx(cr)} 0 0 1 ${P(edge(a0, riC, dI, 1))}`,
    `L ${P(edge(a0, roC, dO, 1))}`,
    `A ${fx(cr)} ${fx(cr)} 0 0 1 ${P(polar(cx, cy, ro, a0 + dO))}`,
    "Z",
  ].join(" ");
}

/**
 * The ring at `scale` (1 = iOS icon), centred on (512, 512) by its bounding box, nudged left a touch because the
 * open side carries less weight. `gapScale` widens the gaps for tiny renders (favicon).
 */
function geometry(scale, { gapScale = 1 } = {}) {
  const { ri, ro, open, gap, cr } = RING;
  // Bounding box of the ring around its own centre: left edge -ro, right edge at the terminals' outer corners.
  const right = ro * Math.cos(rad(open));
  const cx = 512 - ((right - ro) / 2) * scale - 4 * scale;
  const cy = 512;
  const start = open;
  const end = 360 - open;
  const total = SEGMENTS.reduce((s, x) => s + x.w, 0);
  let a = start;
  const segments = SEGMENTS.map((s) => {
    const a1 = a + ((end - start) * s.w) / total;
    const d = sector(
      cx,
      cy,
      ri * scale,
      ro * scale,
      a,
      a1,
      gap * scale * gapScale,
      cr * scale,
    );
    a = a1;
    return { ...s, d };
  });
  return { cx, cy, ri: ri * scale, ro: ro * scale, scale, segments };
}

const svg = (body, defs = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${defs ? `\n  <defs>${defs}\n  </defs>` : ""}${body}\n</svg>\n`;

/**
 * Full-colour ring: each segment shaded light to deep across itself, a soft light catching every upward-facing edge
 * (the segment minus itself nudged down, blurred a little), and one soft shadow under the ring.
 * `shadow` is the shadow opacity (0 = none).
 */
function colourMark(g, { shadow = 0.42, highlight = true } = {}) {
  const { scale } = g;
  const lift = 9 * scale;
  let defs = `
    <filter id="shadow" x="-25%" y="-25%" width="150%" height="150%"><feDropShadow dx="0" dy="${fx(22 * scale)}" stdDeviation="${fx(28 * scale)}" flood-color="#000" flood-opacity="${shadow}"/></filter>
    <filter id="soften" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="${fx(2.5 * scale)}"/></filter>`;
  let fills = "";
  let lights = "";
  g.segments.forEach((s, i) => {
    defs += `
    <linearGradient id="seg${i}" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0" stop-color="${s.c[0]}"/><stop offset="1" stop-color="${s.c[1]}"/>
    </linearGradient>
    <clipPath id="clip${i}"><path d="${s.d}"/></clipPath>
    <mask id="edge${i}" maskUnits="userSpaceOnUse" x="0" y="0" width="1024" height="1024">
      <path d="${s.d}" fill="#fff"/><path d="${s.d}" fill="#000" transform="translate(0 ${fx(lift)})" filter="url(#soften)"/>
    </mask>`;
    fills += `\n    <path d="${s.d}" fill="url(#seg${i})"/>`;
    lights += `\n    <g clip-path="url(#clip${i})"><rect width="1024" height="1024" fill="#fff" fill-opacity="0.5" mask="url(#edge${i})"/></g>`;
  });
  const body = `
  <g${shadow ? ' filter="url(#shadow)"' : ""}>${fills}
  </g>${highlight ? lights : ""}`;
  return { defs, body };
}

/** Flat silhouette (Android themed icon) or per-segment grays (iOS tinted). */
function flatMark(g, { color, grays = false } = {}) {
  const body = g.segments
    .map((s) => `\n  <path d="${s.d}" fill="${grays ? s.gray : color}"/>`)
    .join("");
  return { defs: "", body };
}

const fieldDefs = `
    <radialGradient id="field" cx="0.3" cy="0.1" r="1.1">
      <stop offset="0" stop-color="${FIELD.top}"/><stop offset="0.55" stop-color="${FIELD.mid}"/><stop offset="1" stop-color="${FIELD.base}"/>
    </radialGradient>
    <linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity="0.07"/><stop offset="0.5" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>`;
const field = `\n  <rect width="1024" height="1024" fill="url(#field)"/>`;
const sheen = `\n  <rect width="1024" height="1024" fill="url(#sheen)"/>`;

/** Background colour for app.json's android.adaptiveIcon.backgroundColor (the field's mid tone). */
export const BACKGROUND = FIELD.mid;

/** iOS / default icon: full-bleed emerald field, colour ring. Opaque. */
export function appIcon() {
  const m = colourMark(geometry(1));
  return svg(field + m.body + sheen, fieldDefs + m.defs);
}

/** iOS 18 dark appearance: the colour ring on transparent; the system supplies its dark backdrop. */
export function appIconDark() {
  const m = colourMark(geometry(1), { shadow: 0.3 });
  return svg(m.body, m.defs);
}

/** iOS 18 tinted appearance: grayscale ring on black; the system maps luminance to the user's tint. */
export function appIconTinted() {
  const m = flatMark(geometry(1), { grays: true });
  return svg(`\n  <rect width="1024" height="1024" fill="#000"/>${m.body}`);
}

/** Android adaptive foreground: transparent, the ring inside the 66dp safe circle (r ≈ 313px of 1024). */
const ANDROID_SCALE = 0.76;
export function androidForeground() {
  const m = colourMark(geometry(ANDROID_SCALE), { shadow: 0.36 });
  return svg(m.body, m.defs);
}

export function androidMonochrome() {
  const m = flatMark(geometry(ANDROID_SCALE), { color: "#fff" });
  return svg(m.body);
}

export function androidBackground() {
  return svg(field + sheen, fieldDefs);
}

/** Web favicon: the ring a little larger with wider gaps and no rim light, so it holds at 16–32px. */
export function favicon() {
  const m = colourMark(geometry(1.14, { gapScale: 1.25 }), {
    shadow: 0.3,
    highlight: false,
  });
  return svg(field + m.body, fieldDefs + m.defs);
}
