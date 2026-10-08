import { minorDigits } from "./currencies";

/** Display-only conversion. The result is never persisted. */
export function convertMinor(
  minor: number,
  from: string,
  to: string,
  rate: number,
): number {
  if (from === to) return minor;
  const major = minor / 10 ** minorDigits(from);
  return Math.round(major * rate * 10 ** minorDigits(to));
}

export type RateLookup = (base: string, quote: string) => number | null;

export interface RateRow {
  base: string;
  quote: string;
  rate: number;
}

/** Direct rate, else the inverse of the opposite pair, else null. */
export function makeRateLookup(rows: readonly RateRow[]): RateLookup {
  const map = new Map<string, number>();
  for (const row of rows) map.set(`${row.base}>${row.quote}`, row.rate);
  return (base, quote) => {
    if (base === quote) return 1;
    const direct = map.get(`${base}>${quote}`);
    if (direct !== undefined) return direct;
    const inverse = map.get(`${quote}>${base}`);
    return inverse !== undefined && inverse > 0 ? 1 / inverse : null;
  };
}

/** Converts with a lookup; amounts without a known rate stay unconverted. */
export function convertWithRates(
  minor: number,
  from: string,
  to: string,
  lookup: RateLookup,
): number {
  const rate = lookup(from, to);
  return rate === null ? minor : convertMinor(minor, from, to, rate);
}

/**
 * Sums amounts in `to`. Amounts whose currency has no rate to `to` are excluded rather than
 * added unconverted (100 USD is not 100 EUR); `excluded` counts them.
 */
export function sumConverted(
  items: readonly { minor: number; currency: string }[],
  to: string,
  lookup: RateLookup,
): { total: number; excluded: number } {
  let total = 0;
  let excluded = 0;
  for (const item of items) {
    const rate = lookup(item.currency, to);
    if (rate === null) excluded++;
    else total += convertMinor(item.minor, item.currency, to, rate);
  }
  return { total, excluded };
}
