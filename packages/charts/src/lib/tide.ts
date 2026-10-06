/** Pure maths for the Home "Tide" chart (ART-DIRECTION 6.4). Functions marked `worklet` also run on the UI thread. */

import { monotoneSegments, type Pt, type Segment } from "./smooth";

export const TIDE = {
  wave1: { length: 150, amplitude: 1.6, period: 7 },
  wave2: { length: 92, amplitude: 0.9, period: 11, phase: 1.3 },
  /** Back wave: same sines, larger, offset by a fraction of a cycle and raised. */
  back: { amplitudeScale: 1.25, phaseCycles: 0.37, lift: 2.5 },
  ramp: 28,
  step: 3,
  causticPeriod: 14,
  causticDrift: 0.38,
  breathPeriod: 9,
  breathDepth: 0.06,
} as const;

const TAU = Math.PI * 2;

/** Sum of the two travelling sines at `x` and time `t` (s), in points, positive = up. Wave 1 travels left, wave 2 right. */
export function tideWave(
  x: number,
  t: number,
  phaseCycles = 0,
  scale = 1,
): number {
  "worklet";
  const w1 =
    TIDE.wave1.amplitude *
    Math.sin(
      TAU * (x / TIDE.wave1.length + t / TIDE.wave1.period + phaseCycles),
    );
  const w2 =
    TIDE.wave2.amplitude *
    Math.sin(
      TAU * (x / TIDE.wave2.length - t / TIDE.wave2.period + phaseCycles) +
        TIDE.wave2.phase,
    );
  return (w1 + w2) * scale;
}

/** 0 at the shore join, 1 after `TIDE.ramp` points; smoothstep so the join with the shore is exact. */
export function tideRamp(x: number, joinX: number): number {
  "worklet";
  const s = Math.min(Math.max((x - joinX) / TIDE.ramp, 0), 1);
  return s * s * (3 - 2 * s);
}

/** Pool x samples from the join to the right edge, every `TIDE.step` points, always ending on the edge. */
export function poolSamples(joinX: number, width: number): number[] {
  const xs: number[] = [];
  for (let x = joinX + TIDE.step; x < width; x += TIDE.step) xs.push(x);
  xs.push(width);
  return xs;
}

export interface TideGeometry {
  /** Shore start (x = 0, baseline) followed by end-of-day points up to today. */
  shore: Pt[];
  segments: Segment[];
  /** Where the shore ends and the pool starts. */
  joinX: number;
  /** y of today's level (and the still water after it). */
  levelY: number;
  baseline: number;
  yMax: number;
}

/**
 * Frame is the whole month: x = 0 at the start of day 1, x = width at the end of the last day. `cumulative[i]` is the
 * spend at the end of day i (today is the last entry). y-max is the biggest reference x 1.25.
 */
export function tideGeometry(
  cumulative: readonly number[],
  days: number,
  reference: number,
  width: number,
  height: number,
): TideGeometry {
  const spent = cumulative.length > 0 ? cumulative[cumulative.length - 1]! : 0;
  const yMax = Math.max(spent, reference, 1) * 1.25;
  const y = (v: number) => height - (v / yMax) * height;
  const x = (i: number) => (days <= 0 ? 0 : ((i + 1) / days) * width);
  const shore: Pt[] = [
    [0, height],
    ...cumulative.map((v, i) => [x(i), y(v)] as const),
  ];
  const joinX = shore[shore.length - 1]![0];
  return {
    shore,
    segments: monotoneSegments(shore),
    joinX,
    levelY: y(spent),
    baseline: height,
    yMax,
  };
}

export interface TideBar {
  label: string;
  amount: number;
  current: boolean;
}

export interface TideBarRect {
  x: number;
  width: number;
  height: number;
}

/** Bars centred in equal slots: 40 pt wide at most, 2 pt gap minimum, tallest = `height`, 6 pt minimum when non-zero. */
export function barRects(
  amounts: readonly number[],
  width: number,
  height: number,
): TideBarRect[] {
  const n = amounts.length;
  if (n === 0 || width <= 0) return [];
  const slot = width / n;
  const barWidth = Math.max(Math.min(40, slot - 2), 2);
  const max = amounts.reduce((m, a) => Math.max(m, a), 0);
  return amounts.map((a, i) => ({
    x: i * slot + (slot - barWidth) / 2,
    width: barWidth,
    height: max <= 0 || a <= 0 ? 0 : Math.max((a / max) * height, 6),
  }));
}

/** Newest `max` entries, with older ones folded into the leftmost bar. */
export function foldOlder<T extends { amount: number }>(
  items: readonly T[],
  max: number,
): T[] {
  if (items.length <= max) return [...items];
  const keep = items.slice(items.length - max);
  const folded = items
    .slice(0, items.length - max + 1)
    .reduce((s, i) => s + i.amount, 0);
  return [{ ...keep[0]!, amount: folded }, ...keep.slice(1)];
}

/**
 * Which elapsed day an x position selects on the Tide chart: day i ends at x = (i + 1) / days * width, so the slot
 * under the finger is its day. -1 when there is nothing to select or x is past today's end (the still water).
 */
export function tideDayAt(x: number, width: number, days: number, elapsed: number): number {
  if (width <= 0 || days <= 0 || elapsed <= 0) return -1;
  const count = Math.min(elapsed, days);
  if (x > (count / days) * width) return -1;
  return Math.min(count - 1, Math.max(0, Math.floor((x / width) * days)));
}

/** Centre x of month bar `index` of `count` equal slots. */
export function tideBarCenter(index: number, width: number, count: number): number {
  return count <= 0 ? 0 : ((index + 0.5) / count) * width;
}

/** Selection that survives only until the read-out has faded: ms from the last change to clearing it. */
export const SELECTION_CLEAR_MS = 1800;
