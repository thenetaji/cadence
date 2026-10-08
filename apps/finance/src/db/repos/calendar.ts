import { endOfMonthKey, listDays, makeKey, parseKey, weekday } from '@studio/dates';
import { buildSeries, sumLines, type ConversionContext } from '@/lib/insights';
import { getRateLookup } from './fx';
import { spendLines } from './reports';
import { getSetting } from './settings';
import type { Db } from '../types';

export interface DailyTotal {
  dateKey: string;
  /** Display-currency minor units; 0 for quiet days. */
  amount: number;
}

export interface DailyTotals {
  /** First day of the month, `YYYY-MM-01`. */
  month: string;
  kind: 'expense' | 'income';
  currency: string;
  /** One entry per calendar day of the month, in order. */
  days: DailyTotal[];
  /** Largest daily amount, for scaling a heatmap (0 when the month is empty). */
  max: number;
  total: number;
  /** 1 = Monday ... 7 = Sunday, for laying out the first row of the grid. */
  firstWeekday: number;
}

/**
 * Per-day totals for the calendar month containing `month` (a date key or `YYYY-MM`).
 * Only plain expense and income count; transfers and lending are excluded.
 */
export function dailyTotals(db: Db, month: string, kind: 'expense' | 'income' = 'expense'): DailyTotals {
  const { year, month: m } = parseKey(month.length === 7 ? `${month}-01` : month);
  const from = makeKey(year, m, 1);
  const to = endOfMonthKey(from);
  const ctx: ConversionContext = { displayCurrency: getSetting(db, 'display_currency'), rates: getRateLookup(db) };
  const lines = spendLines(db, { from, to });
  const series = buildSeries(lines, kind, { type: 'custom', from, to }, ctx, { granularity: 'day' });
  const days = listDays(from, to).map((dateKey, i) => ({ dateKey, amount: series[i]?.amount ?? 0 }));
  return {
    month: from,
    kind,
    currency: ctx.displayCurrency,
    days,
    max: days.reduce((max, d) => Math.max(max, d.amount), 0),
    total: sumLines(lines, kind, { from, to }, ctx),
    firstWeekday: weekday(from),
  };
}

export interface RangeTotals {
  from: string;
  to: string;
  kind: 'expense' | 'income';
  currency: string;
  /** One entry per day from `from` to `to` inclusive, in order. */
  days: DailyTotal[];
}

/** Per-day totals for an arbitrary inclusive range (the Home heatmap). Same exclusions as `dailyTotals`. */
export function rangeDailyTotals(db: Db, from: string, to: string, kind: 'expense' | 'income' = 'expense'): RangeTotals {
  const ctx: ConversionContext = { displayCurrency: getSetting(db, 'display_currency'), rates: getRateLookup(db) };
  const lines = spendLines(db, { from, to });
  const series = buildSeries(lines, kind, { type: 'custom', from, to }, ctx, { granularity: 'day' });
  const days = listDays(from, to).map((dateKey, i) => ({ dateKey, amount: series[i]?.amount ?? 0 }));
  return { from, to, kind, currency: ctx.displayCurrency, days };
}
