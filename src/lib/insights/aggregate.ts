import { addMonths, diffDays, listDays, makeKey, parseKey, type DateKey, type Period } from '../dates';
import { convertWithRates, type RateLookup } from '../money';
import type { FlatLine } from './types';

export interface ConversionContext {
  displayCurrency: string;
  rates: RateLookup;
}

const inRange = (line: FlatLine, from: DateKey, to: DateKey) => line.dateKey >= from && line.dateKey <= to;

export function convertLine(line: FlatLine, ctx: ConversionContext): number {
  return convertWithRates(line.amount, line.currency, ctx.displayCurrency, ctx.rates);
}

export function sumLines(lines: readonly FlatLine[], kind: FlatLine['kind'], period: Pick<Period, 'from' | 'to'>, ctx: ConversionContext): number {
  let total = 0;
  for (const line of lines) {
    if (line.kind === kind && inRange(line, period.from, period.to)) total += convertLine(line, ctx);
  }
  return total;
}

export interface CategoryTotal {
  categoryId: string | null;
  amount: number;
  /** Whole-number share of the total, 0-100. */
  percent: number;
}

export function categoryTotals(
  lines: readonly FlatLine[],
  kind: FlatLine['kind'],
  period: Pick<Period, 'from' | 'to'>,
  ctx: ConversionContext,
): CategoryTotal[] {
  const sums = new Map<string | null, number>();
  let total = 0;
  for (const line of lines) {
    if (line.kind !== kind || !inRange(line, period.from, period.to)) continue;
    const amount = convertLine(line, ctx);
    sums.set(line.categoryId, (sums.get(line.categoryId) ?? 0) + amount);
    total += amount;
  }
  return [...sums.entries()]
    .map(([categoryId, amount]) => ({ categoryId, amount, percent: total === 0 ? 0 : Math.round((amount * 100) / total) }))
    .sort((a, b) => b.amount - a.amount);
}

export interface GroupedTotal extends CategoryTotal {
  isOther: boolean;
}

/** Top `limit` categories plus one "Other" bucket for the remainder. */
export function groupTopCategories(totals: readonly CategoryTotal[], limit = 8): GroupedTotal[] {
  const head = totals.slice(0, limit).map((t) => ({ ...t, isOther: false }));
  const rest = totals.slice(limit);
  if (rest.length === 0) return head;
  const amount = rest.reduce((sum, t) => sum + t.amount, 0);
  const percent = rest.reduce((sum, t) => sum + t.percent, 0);
  return [...head, { categoryId: null, amount, percent, isOther: true }];
}

export interface SeriesPoint {
  /** Day key, or the first-of-month key for monthly buckets. */
  key: DateKey;
  amount: number;
}

export type Granularity = 'day' | 'month';

export function granularityFor(period: Period): Granularity {
  if (period.type === 'year') return 'month';
  if (period.type === 'custom' && diffDays(period.from, period.to) + 1 > 92) return 'month';
  return 'day';
}

export function buildSeries(
  lines: readonly FlatLine[],
  kind: FlatLine['kind'],
  period: Period,
  ctx: ConversionContext,
  options: { categoryId?: string | null; granularity?: Granularity } = {},
): SeriesPoint[] {
  const granularity = options.granularity ?? granularityFor(period);
  const bucketOf = (key: DateKey) => (granularity === 'day' ? key : monthBucket(key));
  const keys: DateKey[] =
    granularity === 'day' ? listDays(period.from, period.to) : monthBuckets(period.from, period.to);
  const sums = new Map<DateKey, number>(keys.map((k) => [k, 0]));
  for (const line of lines) {
    if (line.kind !== kind || !inRange(line, period.from, period.to)) continue;
    if (options.categoryId !== undefined && line.categoryId !== options.categoryId) continue;
    const bucket = bucketOf(line.dateKey);
    sums.set(bucket, (sums.get(bucket) ?? 0) + convertLine(line, ctx));
  }
  return keys.map((key) => ({ key, amount: sums.get(key) ?? 0 }));
}

function monthBucket(key: DateKey): DateKey {
  const { year, month } = parseKey(key);
  return makeKey(year, month, 1);
}

function monthBuckets(from: DateKey, to: DateKey): DateKey[] {
  const out: DateKey[] = [];
  for (let k = monthBucket(from); k <= to; k = addMonths(k, 1)) out.push(k);
  return out;
}

/** Mean per bucket in integer minor units, rounded half up. */
export function averageOf(series: readonly SeriesPoint[]): number {
  if (series.length === 0) return 0;
  const total = series.reduce((sum, p) => sum + p.amount, 0);
  return Math.floor((total * 2 + series.length) / (series.length * 2));
}

export interface Delta {
  amount: number;
  /** Whole-number percent change, or null when the previous total is zero. */
  percent: number | null;
}

export function deltaVsPrevious(current: number, previous: number): Delta {
  return {
    amount: current - previous,
    percent: previous === 0 ? null : Math.round(((current - previous) * 100) / previous),
  };
}

export interface PacePoint {
  key: DateKey;
  /** Cumulative spend; null for days after `todayKey`. */
  actual: number | null;
  /** Straight-line target reaching `budget` on the last day. */
  pace: number;
}

export function paceSeries(
  lines: readonly FlatLine[],
  period: Pick<Period, 'from' | 'to'>,
  budget: number,
  todayKey: DateKey,
  ctx: ConversionContext,
  matches: (line: FlatLine) => boolean = () => true,
): PacePoint[] {
  const days = listDays(period.from, period.to);
  const perDay = new Map<DateKey, number>();
  for (const line of lines) {
    if (line.kind !== 'expense' || !inRange(line, period.from, period.to) || !matches(line)) continue;
    perDay.set(line.dateKey, (perDay.get(line.dateKey) ?? 0) + convertLine(line, ctx));
  }
  let running = 0;
  return days.map((key, index) => {
    running += perDay.get(key) ?? 0;
    return {
      key,
      actual: key <= todayKey ? running : null,
      pace: Math.round((budget * (index + 1)) / days.length),
    };
  });
}
