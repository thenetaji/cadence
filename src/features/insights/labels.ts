import { monthName, monthShort, parseKey, periodLength, previousPeriod, type Period } from '@/lib/dates';
import { MINUS, formatMoney } from '@/lib/money';
import { shortDay } from '@/lib/charts';
import type { Delta, Granularity, SeriesPoint } from '@/lib/insights';

import type { InsightsKind } from './params';

/** "vs September", "vs last week", "vs 2025". */
export function previousLabel(period: Period): string {
  const previous = previousPeriod(period);
  switch (period.type) {
    case 'week':
      return 'vs last week';
    case 'month':
      return `vs ${monthName(parseKey(previous.from).month)}`;
    case 'year':
      return `vs ${parseKey(previous.from).year}`;
    case 'custom':
      return 'vs previous period';
  }
}

export interface DeltaLine {
  text: string;
  /** The same change in money ("−₹12,196 vs September"); present when `deltaLine` was given a currency. */
  alt?: string;
  /** True when the change is the good direction: spending fell or income rose. */
  good: boolean;
}

/** "−12% vs September". Null when there is nothing to compare with. */
export function deltaLine(delta: Delta, period: Period, kind: InsightsKind, money?: { currency: string; locale?: string }): DeltaLine | null {
  if (delta.percent === null) return null;
  const suffix = previousLabel(period);
  if (delta.percent === 0) return { text: `No change ${suffix}`, good: false };
  const sign = delta.percent < 0 ? MINUS : '+';
  const good = kind === 'expense' ? delta.percent < 0 : delta.percent > 0;
  const alt = money ? `${sign}${formatMoney(Math.abs(delta.amount), money.currency, { locale: money.locale, decimals: 0 })} ${suffix}` : undefined;
  return { text: `${sign}${Math.abs(delta.percent)}% ${suffix}`, alt, good };
}

/** "Tue 7 · ₹1,240" for days, "Oct · ₹12,400" for months. */
export function scrubLabel(point: SeriesPoint, granularity: Granularity, currency: string, locale?: string): string {
  const amount = formatMoney(point.amount, currency, { locale, decimals: 0 });
  const when = granularity === 'day' ? shortDay(point.key) : monthShort(parseKey(point.key).month);
  return `${when} · ${amount}`;
}

/** Heading for the bar card. */
export function barsTitle(granularity: Granularity, kind: InsightsKind): string {
  const noun = kind === 'expense' ? 'spending' : 'income';
  return granularity === 'day' ? `Daily ${noun}` : `Monthly ${noun}`;
}

/** Label under a mini bar: "5 Oct" for weeks and custom, "Oct" for months, "2026" for years. */
export function trendLabel(period: Period): string {
  const { day, month, year } = parseKey(period.from);
  if (period.type === 'year') return String(year);
  if (period.type === 'month') return monthShort(month);
  return `${day} ${monthShort(month)}`;
}

/** "month", "week", "year" for "Average per …". */
export function periodNoun(period: Period): string {
  if (period.type === 'custom') return `${periodLength(period)} days`;
  return period.type;
}

const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const WEEKDAY_PLURAL = ['Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays', 'Sundays'];

/** "Sat" for weekday 6 (1 = Monday). */
export const weekdayShort = (day: number): string => WEEKDAY_SHORT[day - 1] ?? '';

/** "Most on Saturdays". */
export function peakCaption(day: number): string {
  return `Most on ${WEEKDAY_PLURAL[day - 1] ?? ''}`;
}

/** "61%", "−12%", or an em dash when there is no rate. */
export function percentText(rate: number | null): string {
  if (rate === null) return '—';
  return `${rate < 0 ? MINUS : ''}${Math.abs(rate)}%`;
}

/** "Sep · In ₹1.45L · Out ₹57.6K · Saved ₹87.4K". */
export function monthlyScrub(pair: { key: string; income: number; spent: number }, currency: string, locale?: string): string {
  const compact = (value: number) => formatMoney(value, currency, { compact: true, locale });
  return `${monthShort(parseKey(pair.key).month)} · In ${compact(pair.income)} · Out ${compact(pair.spent)} · Saved ${compact(pair.income - pair.spent)}`;
}
