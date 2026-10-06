import { diffDays, periodFor, previousPeriod, weekday, type DateKey, type Period, type PeriodSettings } from '../dates';
import { convertLine, type ConversionContext } from './aggregate';
import type { FlatLine } from './types';

/** A flat line that still knows which transaction, title and account it came from. */
export interface DetailedLine extends FlatLine {
  transactionId: string;
  title: string;
  accountId: string;
}

type Range = Pick<Period, 'from' | 'to'>;
type Kind = FlatLine['kind'];

const within = (line: FlatLine, range: Range) => line.dateKey >= range.from && line.dateKey <= range.to;

/** Lower-cased, trimmed, single-spaced: "  Swiggy  " and "swiggy" are the same merchant. */
export const normaliseTitle = (title: string): string => title.trim().replace(/\s+/g, ' ').toLowerCase();

/** Integer share 0-100 of `part` in `whole`. */
const share = (part: number, whole: number): number => (whole <= 0 ? 0 : Math.round((part * 100) / whole));

/** Sum of line amounts per category, returning the largest one's id (ties keep first seen). */
function dominantCategory(amounts: Map<string | null, number>): string | null {
  let best: string | null = null;
  let max = -1;
  for (const [id, amount] of amounts) {
    if (amount > max) {
      max = amount;
      best = id;
    }
  }
  return best;
}

export interface WeekdayAverage {
  /** 1 = Monday ... 7 = Sunday. */
  weekday: number;
  total: number;
  /** How many of this weekday fall in the counted range. */
  occurrences: number;
  /** Mean per occurrence, minor units, rounded half up; zero-spend weeks count. */
  average: number;
}

/** Number of `weekdayNumber` days in [from, to]. */
export function countWeekday(range: Range, weekdayNumber: number): number {
  const length = diffDays(range.from, range.to) + 1;
  if (length <= 0) return 0;
  const offset = (weekdayNumber - weekday(range.from) + 7) % 7;
  return offset >= length ? 0 : Math.floor((length - 1 - offset) / 7) + 1;
}

/** Last day that counts: days still to come would only drag averages down. */
export function effectiveEnd(period: Range, todayKey?: DateKey): DateKey {
  if (todayKey && todayKey >= period.from && todayKey < period.to) return todayKey;
  return period.to;
}

/** Average amount per weekday, ordered from `weekStart`; averaged over every such weekday in the range. */
export function weekdayAverages(lines: readonly FlatLine[], kind: Kind, period: Range, weekStart: number, ctx: ConversionContext, todayKey?: DateKey): WeekdayAverage[] {
  const range = { from: period.from, to: effectiveEnd(period, todayKey) };
  const totals = new Array<number>(8).fill(0);
  for (const line of lines) {
    if (line.kind !== kind || !within(line, range)) continue;
    totals[weekday(line.dateKey)] = (totals[weekday(line.dateKey)] ?? 0) + convertLine(line, ctx);
  }
  return Array.from({ length: 7 }, (_, i) => {
    const day = ((weekStart - 1 + i) % 7) + 1;
    const occurrences = countWeekday(range, day);
    const total = totals[day] ?? 0;
    return { weekday: day, total, occurrences, average: occurrences === 0 ? 0 : Math.floor((total * 2 + occurrences) / (occurrences * 2)) };
  });
}

/** Index of the highest weekday average, or null when nothing was spent. */
export function peakIndex(values: readonly number[]): number | null {
  let best: number | null = null;
  values.forEach((v, i) => {
    if (v > 0 && (best === null || v > (values[best] ?? 0))) best = i;
  });
  return best;
}

export interface TitleTotal {
  /** Normalised title. */
  key: string;
  /** Title as first written (most recent casing wins ties by first seen). */
  title: string;
  amount: number;
  /** Distinct transactions. */
  count: number;
  /** Share of the kind's total in the period, 0-100. */
  percent: number;
  categoryId: string | null;
}

/** Top titles by total; untitled transactions are skipped. */
export function topTitles(lines: readonly DetailedLine[], kind: Kind, period: Range, ctx: ConversionContext, limit = 5): TitleTotal[] {
  type Acc = { title: string; amount: number; ids: Set<string>; categories: Map<string | null, number> };
  const groups = new Map<string, Acc>();
  let total = 0;
  for (const line of lines) {
    if (line.kind !== kind || !within(line, period)) continue;
    const amount = convertLine(line, ctx);
    total += amount;
    const key = normaliseTitle(line.title);
    if (key === '') continue;
    const group = groups.get(key) ?? { title: line.title.trim().replace(/\s+/g, ' '), amount: 0, ids: new Set<string>(), categories: new Map() };
    group.amount += amount;
    group.ids.add(line.transactionId);
    group.categories.set(line.categoryId, (group.categories.get(line.categoryId) ?? 0) + amount);
    groups.set(key, group);
  }
  return [...groups.entries()]
    .map(([key, g]) => ({ key, title: g.title, amount: g.amount, count: g.ids.size, percent: share(g.amount, total), categoryId: dominantCategory(g.categories) }))
    .sort((a, b) => b.amount - a.amount || b.count - a.count || a.key.localeCompare(b.key))
    .slice(0, limit);
}

export interface AccountTotal {
  accountId: string;
  amount: number;
  percent: number;
}

export function byAccount(lines: readonly DetailedLine[], kind: Kind, period: Range, ctx: ConversionContext): AccountTotal[] {
  const sums = new Map<string, number>();
  let total = 0;
  for (const line of lines) {
    if (line.kind !== kind || !within(line, period)) continue;
    const amount = convertLine(line, ctx);
    sums.set(line.accountId, (sums.get(line.accountId) ?? 0) + amount);
    total += amount;
  }
  return [...sums.entries()]
    .map(([accountId, amount]) => ({ accountId, amount, percent: share(amount, total) }))
    .sort((a, b) => b.amount - a.amount || a.accountId.localeCompare(b.accountId));
}

export interface TransactionTotal {
  transactionId: string;
  title: string;
  dateKey: DateKey;
  amount: number;
  categoryId: string | null;
}

/** Whole transactions of a kind in the range (split lines are folded back together), largest first. */
export function transactionTotals(lines: readonly DetailedLine[], kind: Kind, period: Range, ctx: ConversionContext): TransactionTotal[] {
  type Acc = { title: string; dateKey: DateKey; amount: number; categories: Map<string | null, number> };
  const groups = new Map<string, Acc>();
  for (const line of lines) {
    if (line.kind !== kind || !within(line, period)) continue;
    const amount = convertLine(line, ctx);
    const group = groups.get(line.transactionId) ?? { title: line.title, dateKey: line.dateKey, amount: 0, categories: new Map() };
    group.amount += amount;
    group.categories.set(line.categoryId, (group.categories.get(line.categoryId) ?? 0) + amount);
    groups.set(line.transactionId, group);
  }
  return [...groups.entries()]
    .map(([transactionId, g]) => ({ transactionId, title: g.title.trim(), dateKey: g.dateKey, amount: g.amount, categoryId: dominantCategory(g.categories) }))
    .sort((a, b) => b.amount - a.amount || (a.dateKey < b.dateKey ? 1 : -1));
}

/** The largest single transaction of a kind, or null. */
export function biggest(lines: readonly DetailedLine[], kind: Kind, period: Range, ctx: ConversionContext): TransactionTotal | null {
  return transactionTotals(lines, kind, period, ctx)[0] ?? null;
}

/** (earned - spent) / earned as a whole percent; null when nothing was earned. */
export function savingsRate(earned: number, spent: number): number | null {
  return earned <= 0 ? null : Math.round(((earned - spent) * 100) / earned);
}

/** Mean per day over the days that have happened, minor units, rounded half up. */
export function dailyAverage(total: number, period: Range, todayKey?: DateKey): number {
  const days = diffDays(period.from, effectiveEnd(period, todayKey)) + 1;
  return days <= 0 ? 0 : Math.floor((total * 2 + days) / (days * 2));
}

export interface MonthlyPair {
  /** First day of the month period; also its key. */
  key: DateKey;
  from: DateKey;
  to: DateKey;
  income: number;
  spent: number;
}

/** `count` month periods (honouring `monthStart`) ending at the one that contains `endRef`, oldest first. */
export function monthPeriodsEnding(endRef: DateKey, count: number, settings: PeriodSettings): Period[] {
  const out: Period[] = [];
  let p = periodFor('month', endRef, settings);
  for (let i = 0; i < count; i++) {
    out.unshift(p);
    p = previousPeriod(p);
  }
  return out;
}

/** Income and spending per month for the last `count` months ending at the month of `endRef`. */
export function pairedMonthly(lines: readonly FlatLine[], endRef: DateKey, settings: PeriodSettings, ctx: ConversionContext, count = 6): MonthlyPair[] {
  const periods = monthPeriodsEnding(endRef, count, settings);
  return periods.map((p) => {
    let income = 0;
    let spent = 0;
    for (const line of lines) {
      if (!within(line, p)) continue;
      if (line.kind === 'income') income += convertLine(line, ctx);
      else spent += convertLine(line, ctx);
    }
    return { key: p.from, from: p.from, to: p.to, income, spent };
  });
}

/** Range of dates that `pairedMonthly` plus the selected period need. */
export function extrasRange(period: Range, endRef: DateKey, settings: PeriodSettings, count = 6): Range {
  const periods = monthPeriodsEnding(endRef, count, settings);
  const first = periods[0]!;
  const last = periods[periods.length - 1]!;
  return { from: first.from < period.from ? first.from : period.from, to: last.to > period.to ? last.to : period.to };
}
