import { and, eq } from 'drizzle-orm';
import { convertWithRates, makeRateLookup, type RateLookup } from '@/lib/money';
import { fxRates, type FxRateRow } from '../schema';
import type { Db } from '../types';

export function getRate(db: Db, base: string, quote: string): number | null {
  return getRateLookup(db)(base, quote);
}

export function setRate(db: Db, base: string, quote: string, rate: number, now = Date.now()): void {
  if (!(rate > 0) || !Number.isFinite(rate)) throw new RangeError('rate must be a positive number');
  db.insert(fxRates)
    .values({ base, quote, rate, updatedAt: now })
    .onConflictDoUpdate({ target: [fxRates.base, fxRates.quote], set: { rate, updatedAt: now } })
    .run();
}

export function deleteRate(db: Db, base: string, quote: string): void {
  db.delete(fxRates).where(and(eq(fxRates.base, base), eq(fxRates.quote, quote))).run();
}

export function listRates(db: Db): FxRateRow[] {
  return db.select().from(fxRates).all();
}

export function getRateLookup(db: Db): RateLookup {
  return makeRateLookup(listRates(db));
}

/** Display-only conversion; never persist the result. Unknown rates leave the amount unconverted. */
export function convert(db: Db, minor: number, from: string, to: string): number {
  return convertWithRates(minor, from, to, getRateLookup(db));
}
