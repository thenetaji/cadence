import { motion } from './tokens';

/** Pure scheduling helpers: kept free of Reanimated so they unit-test without a runtime. */

export type StaggerOptions = { step?: number; cap?: number; base?: number };

/**
 * Delay in ms for the sibling at `index`, or `null` when it is past the cap and must appear
 * instantly. Reduce Motion always yields `null` (no choreography).
 */
export function staggerDelay(index: number, options: StaggerOptions & { reduced?: boolean } = {}): number | null {
  const { step = motion.staggerStep, cap = motion.staggerCap, base = 0, reduced = false } = options;
  if (reduced || index < 0 || index >= cap) return null;
  return base + index * step;
}

/** Duration under Reduce Motion collapses to 0 (instant). */
export function motionMs(reduced: boolean, ms: number): number {
  return reduced ? 0 : ms;
}

/** Amplitude (rise, scale delta, float distance) under Reduce Motion is 0. */
export function motionAmount(reduced: boolean, amount: number): number {
  return reduced ? 0 : amount;
}

/** 0 at `start`, 1 at `end`, clamped. Pure; also usable inside worklets. */
export function scrollProgress(y: number, start: number, end: number): number {
  'worklet';
  if (end === start) return y >= end ? 1 : 0;
  return Math.min(1, Math.max(0, (y - start) / (end - start)));
}

