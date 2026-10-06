import { spendLines } from '@/db/repos/reports';
import type { Db } from '@/db/types';
import { diffDays, monthShort, parseKey, previousPeriod, type DateKey, type Period } from '@studio/dates';
import { buildSeries, sumLines, type ConversionContext, type FlatLine } from '@/lib/insights';
import { conversionContext } from './summary';

export interface HomeSpendPoint {
  /** Cumulative spend this period in minor units; null after today. */
  actual: number | null;
  /** Cumulative spend last period at the same day. */
  pace: number;
  /** Cumulative income this period in minor units; null after today. */
  income: number | null;
}

export interface HomeSpend {
  currency: string;
  /** First day of the period; series entry i is this plus i days. */
  from: string;
  spent: number;
  earned: number;
  /** Last period's spend up to the same day-of-period. */
  previousSameDay: number;
  /** Last period's full total (the Tide chart's water-level reference). */
  previousTotal: number;
  /** Whole-percent change vs the same day last period; null when there was nothing to compare. */
  deltaPercent: number | null;
  /** Average spend per elapsed day. */
  perDay: number;
  /** Zero-based index of today in the period. */
  dayIndex: number;
  series: HomeSpendPoint[];
}

export function cumulative(amounts: readonly number[]): number[] {
  let sum = 0;
  return amounts.map((a) => (sum += a));
}

/** Percent change of `current` over `previous`, rounded half away from zero; null when `previous` is 0. */
export function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  const raw = ((current - previous) / previous) * 100;
  return raw < 0 ? -Math.round(-raw) : Math.round(raw);
}

/** Mean per elapsed day, rounded half up. */
export function perDayAverage(spent: number, elapsedDays: number): number {
  return elapsedDays <= 0 ? 0 : Math.floor((spent * 2 + elapsedDays) / (elapsedDays * 2));
}

/** Pure core: daily amounts for this and the previous period plus today's index. */
export function buildHomeSpend(
  current: readonly number[],
  previous: readonly number[],
  dayIndex: number,
  income: readonly number[] = [],
): { series: HomeSpendPoint[]; spent: number; previousSameDay: number; deltaPercent: number | null; perDay: number } {
  const now = cumulative(current);
  const before = cumulative(previous);
  const last = (list: readonly number[], i: number) => (list.length === 0 ? 0 : (list[Math.min(i, list.length - 1)] ?? 0));
  const today = Math.min(Math.max(dayIndex, 0), Math.max(current.length - 1, 0));
  const earnedNow = cumulative(current.map((_, i) => income[i] ?? 0));
  const series = current.map((_, i) => ({
    actual: i <= today ? (now[i] ?? 0) : null,
    pace: last(before, i),
    income: i <= today ? (earnedNow[i] ?? 0) : null,
  }));
  const spent = now[today] ?? 0;
  const previousSameDay = last(before, today);
  return { series, spent, previousSameDay, deltaPercent: percentChange(spent, previousSameDay), perDay: perDayAverage(spent, today + 1) };
}

export function readHomeSpend(db: Db, period: Period, todayKey: string): HomeSpend {
  const ctx: ConversionContext = conversionContext(db);
  const previous = previousPeriod(period);
  const lines: FlatLine[] = spendLines(db, { from: previous.from, to: period.to });
  const amounts = (p: Period) => buildSeries(lines, 'expense', p, ctx, { granularity: 'day' }).map((x) => x.amount);
  const incomeDaily = buildSeries(lines, 'income', period, ctx, { granularity: 'day' }).map((x) => x.amount);
  const dayIndex = Math.max(diffDays(period.from, todayKey), 0);
  const core = buildHomeSpend(amounts(period), amounts(previous), dayIndex, incomeDaily);
  return {
    currency: ctx.displayCurrency,
    from: period.from,
    earned: sumLines(lines, 'income', period, ctx),
    previousTotal: sumLines(lines, 'expense', previous, ctx),
    dayIndex,
    ...core,
  };
}

export interface AllTimeMonth {
  /** First day of the month. */
  key: DateKey;
  /** Three-letter month name. */
  label: string;
  amount: number;
}

export interface AllTimeSpend {
  currency: string;
  spent: number;
  earned: number;
  /** Average spend per day since the first transaction. */
  perDay: number;
  /** One entry per calendar month from the first transaction to today, oldest first. */
  months: AllTimeMonth[];
}

/** Pure core: monthly expense totals between the first dated line and today. */
export function buildAllTime(lines: readonly FlatLine[], todayKey: string, ctx: ConversionContext): AllTimeSpend {
  const dated = lines.filter((l) => l.dateKey <= todayKey);
  const first = dated.reduce<string | null>((m, l) => (m === null || l.dateKey < m ? l.dateKey : m), null);
  if (first === null) return { currency: ctx.displayCurrency, spent: 0, earned: 0, perDay: 0, months: [] };
  const period: Period = { type: 'custom', from: first, to: todayKey };
  const months = buildSeries(dated, 'expense', period, ctx, { granularity: 'month' }).map((p) => ({
    key: p.key,
    label: monthShort(parseKey(p.key).month),
    amount: p.amount,
  }));
  const spent = months.reduce((s, m) => s + m.amount, 0);
  const days = diffDays(first, todayKey) + 1;
  return { currency: ctx.displayCurrency, spent, earned: sumLines(dated, 'income', period, ctx), perDay: perDayAverage(spent, days), months };
}

export function readAllTime(db: Db, todayKey: string): AllTimeSpend {
  const ctx = conversionContext(db);
  return buildAllTime(spendLines(db, { from: '0000-01-01', to: todayKey }), todayKey, ctx);
}
