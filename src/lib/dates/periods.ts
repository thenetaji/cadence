import { addDays, addMonths, diffDays, makeKey, parseKey, weekday, type DateKey } from './keys';

export type PeriodType = 'week' | 'month' | 'year' | 'custom';

export interface Period {
  type: PeriodType;
  /** Inclusive first day. */
  from: DateKey;
  /** Inclusive last day. */
  to: DateKey;
}

export interface PeriodSettings {
  /** 1 = Monday ... 7 = Sunday. */
  weekStart: number;
  /** Day of month 1-28 on which a month period begins. */
  monthStart: number;
}

export const DEFAULT_PERIOD_SETTINGS: PeriodSettings = { weekStart: 1, monthStart: 1 };

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3));
const WEEKDAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const monthName = (month: number): string => MONTHS[month - 1] ?? '';
export const monthShort = (month: number): string => MONTHS_SHORT[month - 1] ?? '';

export function weekRange(ref: DateKey, weekStart: number): { from: DateKey; to: DateKey } {
  const offset = (weekday(ref) - weekStart + 7) % 7;
  const from = addDays(ref, -offset);
  return { from, to: addDays(from, 6) };
}

export function monthRange(ref: DateKey, monthStart: number): { from: DateKey; to: DateKey } {
  const { year, month, day } = parseKey(ref);
  const firstOfRefMonth = makeKey(year, month, monthStart);
  const from = day >= monthStart ? firstOfRefMonth : addMonths(makeKey(year, month, monthStart), -1);
  return { from, to: addDays(addMonths(from, 1), -1) };
}

/** Year period starting on the 1st of `startMonth` (1 = calendar year). */
export function yearRange(ref: DateKey, startMonth = 1): { from: DateKey; to: DateKey } {
  const { year, month } = parseKey(ref);
  const startYear = month >= startMonth ? year : year - 1;
  const from = makeKey(startYear, startMonth, 1);
  return { from, to: addDays(makeKey(startYear + 1, startMonth, 1), -1) };
}

export function periodFor(
  type: Exclude<PeriodType, 'custom'>,
  ref: DateKey,
  settings: PeriodSettings = DEFAULT_PERIOD_SETTINGS,
): Period {
  if (type === 'week') return { type, ...weekRange(ref, settings.weekStart) };
  if (type === 'month') return { type, ...monthRange(ref, settings.monthStart) };
  return { type, ...yearRange(ref) };
}

export function customPeriod(from: DateKey, to: DateKey): Period {
  return from <= to ? { type: 'custom', from, to } : { type: 'custom', from: to, to: from };
}

function shift(period: Period, direction: 1 | -1): Period {
  switch (period.type) {
    case 'week':
      return { ...period, from: addDays(period.from, 7 * direction), to: addDays(period.to, 7 * direction) };
    case 'month': {
      const from = addMonths(period.from, direction);
      return { type: 'month', from, to: addDays(addMonths(from, 1), -1) };
    }
    case 'year': {
      const { year, month, day } = parseKey(period.from);
      const from = makeKey(year + direction, month, day);
      return { type: 'year', from, to: addDays(makeKey(year + direction + 1, month, day), -1) };
    }
    case 'custom': {
      const length = diffDays(period.from, period.to) + 1;
      return { type: 'custom', from: addDays(period.from, length * direction), to: addDays(period.to, length * direction) };
    }
  }
}

export const previousPeriod = (period: Period): Period => shift(period, -1);
export const nextPeriod = (period: Period): Period => shift(period, 1);

export function periodLength(period: Period): number {
  return diffDays(period.from, period.to) + 1;
}

export function isInPeriod(period: Period, key: DateKey): boolean {
  return key >= period.from && key <= period.to;
}

function dayMonth(key: DateKey): string {
  const { day, month } = parseKey(key);
  return `${day} ${monthShort(month)}`;
}

export function periodLabel(period: Period): string {
  const start = parseKey(period.from);
  switch (period.type) {
    case 'week':
      return `Week of ${dayMonth(period.from)}`;
    case 'month':
      return start.day === 1
        ? `${monthName(start.month)} ${start.year}`
        : `${dayMonth(period.from)} – ${dayMonth(period.to)}`;
    case 'year':
      return start.month === 1 ? String(start.year) : `${dayMonth(period.from)} ${start.year} – ${dayMonth(period.to)} ${parseKey(period.to).year}`;
    case 'custom': {
      const end = parseKey(period.to);
      return start.year === end.year
        ? `${dayMonth(period.from)} – ${dayMonth(period.to)} ${end.year}`
        : `${dayMonth(period.from)} ${start.year} – ${dayMonth(period.to)} ${end.year}`;
    }
  }
}

export function dayLabel(key: DateKey, todayKey: DateKey): string {
  if (key === todayKey) return 'Today';
  if (key === addDays(todayKey, -1)) return 'Yesterday';
  const { day, month } = parseKey(key);
  return `${WEEKDAYS_SHORT[weekday(key) - 1]} ${day} ${monthShort(month)}`;
}

/** Longer form for the detail screen: "Mon 3 Oct 2026". */
export function fullDayLabel(key: DateKey): string {
  return `${dayLabel(key, '')} ${parseKey(key).year}`;
}

/** Month pickers: the last `count` month periods ending at the one containing `ref`. */
export function recentMonthPeriods(ref: DateKey, count: number, settings: PeriodSettings = DEFAULT_PERIOD_SETTINGS): Period[] {
  const out: Period[] = [];
  let p = periodFor('month', ref, settings);
  for (let i = 0; i < count; i++) {
    out.push(p);
    p = previousPeriod(p);
  }
  return out;
}
