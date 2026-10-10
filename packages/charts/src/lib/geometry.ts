/** Pure chart geometry: no Skia, no React, so it is unit-testable. */

export interface DonutSegment {
  /** Degrees, 0 = 3 o'clock, clockwise (Skia arc convention). */
  start: number;
  sweep: number;
  mid: number;
}

/** Lay out segments clockwise from 12 o'clock with `gap` degrees between neighbours. */
export function donutSegments(
  values: readonly number[],
  gap = 2,
  startAt = -90,
): DonutSegment[] {
  const positive = values.map((v) => Math.max(0, v));
  const total = positive.reduce((a, b) => a + b, 0);
  if (total === 0)
    return positive.map(() => ({ start: startAt, sweep: 0, mid: startAt }));
  const visible = positive.filter((v) => v > 0).length;
  const gapDeg = visible > 1 ? gap : 0;
  const room = 360 - gapDeg * visible;
  let cursor = startAt + gapDeg / 2;
  return positive.map((v) => {
    const sweep = (v / total) * room;
    const segment = { start: cursor, sweep, mid: cursor + sweep / 2 };
    cursor += sweep + (v > 0 ? gapDeg : 0);
    return segment;
  });
}

/** Index of the donut segment under a touch point, or -1. `slop` widens the ring hit area. */
export function hitTestDonut(
  x: number,
  y: number,
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  segments: readonly DonutSegment[],
  slop = 6,
): number {
  const dx = x - cx;
  const dy = y - cy;
  const distance = Math.hypot(dx, dy);
  if (distance < innerRadius - slop || distance > outerRadius + slop) return -1;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  let best = -1;
  let bestDistance = Infinity;
  segments.forEach((segment, index) => {
    if (segment.sweep <= 0) return;
    // Distance from the angle to the segment's arc, wrapped to [-180, 180].
    let delta = ((angle - segment.mid + 540) % 360) - 180;
    delta = Math.abs(delta) - segment.sweep / 2;
    const d = Math.max(0, delta);
    if (d < bestDistance) {
      bestDistance = d;
      best = index;
    }
  });
  return bestDistance <= 4 ? best : -1;
}

/** Which of `count` equal slots an x coordinate falls in, clamped to the plot. */
export function slotIndex(
  x: number,
  left: number,
  width: number,
  count: number,
): number {
  if (count <= 0 || width <= 0) return -1;
  const ratio = (x - left) / width;
  return Math.min(count - 1, Math.max(0, Math.floor(ratio * count)));
}

export interface BarSlot {
  x: number;
  width: number;
  /** Centre of the full slot, for labels. */
  center: number;
}

/** Equal slots with bars inset by `gap` pt in total per slot, capped at `maxWidth`. */
export function barSlots(
  left: number,
  width: number,
  count: number,
  gap = 4,
  maxWidth = 40,
): BarSlot[] {
  if (count <= 0) return [];
  const slot = width / count;
  const bar = Math.max(1, Math.min(maxWidth, slot - gap));
  return Array.from({ length: count }, (_, i) => {
    const center = left + slot * i + slot / 2;
    return { x: center - bar / 2, width: bar, center };
  });
}

/** "Nice" gridline values (minor units) for a plot topping out around `max`; at most `count` positive lines. */
export function niceTicks(
  max: number,
  count = 3,
): { top: number; ticks: number[] } {
  if (!(max > 0) || count < 1) return { top: 0, ticks: [] };
  const rough = max / count;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step =
    [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ??
    10 * magnitude;
  const ticks: number[] = [];
  for (let v = step; ticks.length < count && v < max + step; v += step)
    ticks.push(Math.round(v));
  const top = ticks[ticks.length - 1] ?? 0;
  return {
    top: Math.max(top, max),
    ticks: ticks.filter((t) => t <= Math.max(top, max)),
  };
}

/** Linear map of `value` in [0, top] to a y coordinate where 0 sits at `baseline` and `top` at `baseline - height`. */
export function valueToY(
  value: number,
  top: number,
  baseline: number,
  height: number,
): number {
  if (top <= 0) return baseline;
  return baseline - (Math.min(value, top) / top) * height;
}

/** Evenly spread x for a line chart of `count` points across [left, left + width]. */
export function pointX(
  index: number,
  left: number,
  width: number,
  count: number,
): number {
  if (count <= 1) return left;
  return left + (index / (count - 1)) * width;
}

/** Nearest point index for a line chart. */
export function nearestPoint(
  x: number,
  left: number,
  width: number,
  count: number,
): number {
  if (count <= 0) return -1;
  if (count === 1) return 0;
  const ratio = (x - left) / width;
  return Math.min(count - 1, Math.max(0, Math.round(ratio * (count - 1))));
}

/** Left edge for a floating label of `labelWidth` centred on `center`, kept `margin` inside [0, total]. */
export function clampLabelX(
  center: number,
  labelWidth: number,
  total: number,
  margin = 0,
): number {
  const max = Math.max(margin, total - labelWidth - margin);
  return Math.min(Math.max(center - labelWidth / 2, margin), max);
}

export interface ClippedDomain {
  /** Y-domain ceiling (minor units) that gridlines and bars use. */
  top: number;
  ticks: number[];
  /** True when some bars exceed `top` and should be drawn broken. */
  clipped: boolean;
}

/** Value at percentile `p` (0-1) of the positive entries, nearest-rank. */
export function percentileOf(values: readonly number[], p: number): number {
  const sorted = values.filter((v) => v > 0).sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  return sorted[
    Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1))
  ] as number;
}

/** Bars above `AXIS_AVERAGE_MULTIPLE x average` (or the 90th percentile, whichever is larger) are drawn broken. */
export const AXIS_AVERAGE_MULTIPLE = 4;
export const AXIS_PERCENTILE = 0.9;

/**
 * One axis rule for every bar chart: the axis tops out at max(4 x average, 90th percentile of the
 * non-zero bars). When the tallest bar fits, the axis fits it; otherwise the axis is capped there
 * (rounded up to a nice tick) and bars above it are drawn broken with a value label.
 */
export function barDomain(
  values: readonly number[],
  average: number,
  count = 3,
): ClippedDomain {
  const max = values.reduce((m, v) => Math.max(m, v), 0);
  if (max <= 0) return { top: 0, ticks: [], clipped: false };
  const cap = Math.max(
    AXIS_AVERAGE_MULTIPLE * Math.max(0, average),
    percentileOf(values, AXIS_PERCENTILE),
  );
  if (cap > 0 && max > cap) {
    const { top, ticks } = niceTicks(cap, count);
    return { top, ticks, clipped: true };
  }
  const { top, ticks } = niceTicks(max, count);
  return { top, ticks, clipped: false };
}

/**
 * A rounded [lo, hi] domain with evenly spaced ticks for a line that can dip below zero (balances).
 * Zero is kept in view when the values sit close to it; a flat line gets one step of headroom.
 */
export function niceRange(
  min: number,
  max: number,
  count = 3,
): { lo: number; hi: number; ticks: number[] } {
  if (!Number.isFinite(min) || !Number.isFinite(max) || count < 1)
    return { lo: 0, hi: 0, ticks: [] };
  let low = Math.min(min, max);
  let high = Math.max(min, max);
  // Near zero relative to the spread: show zero so the line's level reads honestly.
  if (low > 0 && low < (high - low) * 0.5) low = 0;
  if (high < 0 && -high < (high - low) * 0.5) high = 0;
  const span = high - low || Math.abs(high) || 1;
  const rough = span / count;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step =
    [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ??
    10 * magnitude;
  const lo = Math.floor(low / step) * step;
  let hi = Math.ceil(high / step) * step;
  if (hi === lo) hi = lo + step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v));
  return { lo: Math.round(lo), hi: Math.round(hi), ticks };
}

/** y for `value` in a [lo, hi] domain drawn between `top` and `bottom`. */
export function rangeToY(
  value: number,
  lo: number,
  hi: number,
  top: number,
  bottom: number,
): number {
  if (hi <= lo) return bottom;
  return bottom - ((value - lo) / (hi - lo)) * (bottom - top);
}
