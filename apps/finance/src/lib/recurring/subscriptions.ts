import type { Frequency } from './next-due';

/** Occurrences per year of one cycle of each frequency. */
const PER_YEAR: Record<Frequency, number> = { daily: 365, weekly: 52, monthly: 12, yearly: 1 };

/** Times the rule charges per year: "every `interval` units". Non-positive intervals count as 1. */
export function chargesPerYear(frequency: Frequency, interval: number): number {
  return PER_YEAR[frequency] / Math.max(1, Math.trunc(interval));
}

/** Integer minor units per year, rounded half up. */
export function yearlyCost(amount: number, frequency: Frequency, interval = 1): number {
  return Math.round(amount * chargesPerYear(frequency, interval));
}

/** Integer minor units per month (a twelfth of the yearly cost, computed from the unrounded yearly), rounded half up. */
export function monthlyCost(amount: number, frequency: Frequency, interval = 1): number {
  return Math.round((amount * chargesPerYear(frequency, interval)) / 12);
}
