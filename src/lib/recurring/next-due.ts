import { addDays, daysInMonth, makeKey, parseKey, type DateKey } from '../dates';

export type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RecurrenceRule {
  frequency: Frequency;
  interval: number;
  /** Day-of-month for monthly rules; kept so a clamped 31st returns to the 31st. */
  anchorDay: number | null;
  startDate: DateKey;
}

/** The occurrence after `current`. Monthly and yearly rules re-derive the day from the anchor, never from the clamped date. */
export function nextDueDate(rule: RecurrenceRule, current: DateKey): DateKey {
  const interval = Math.max(1, Math.trunc(rule.interval));
  switch (rule.frequency) {
    case 'daily':
      return addDays(current, interval);
    case 'weekly':
      return addDays(current, 7 * interval);
    case 'monthly': {
      const { year, month } = parseKey(current);
      const anchor = rule.anchorDay ?? parseKey(rule.startDate).day;
      const index = year * 12 + (month - 1) + interval;
      const y = Math.floor(index / 12);
      const m = (index % 12) + 1;
      return makeKey(y, m, Math.min(anchor, daysInMonth(y, m)));
    }
    case 'yearly': {
      const { year } = parseKey(current);
      const start = parseKey(rule.startDate);
      const y = year + interval;
      return makeKey(y, start.month, Math.min(start.day, daysInMonth(y, start.month)));
    }
  }
}

/** Occurrences from `from` (inclusive) up to `until` (inclusive), bounded by `endDate` and `limit`. */
export function occurrencesBetween(
  rule: RecurrenceRule,
  from: DateKey,
  until: DateKey,
  options: { endDate?: DateKey | null; limit?: number } = {},
): DateKey[] {
  const { endDate = null, limit = 100 } = options;
  const out: DateKey[] = [];
  let due = from;
  while (due <= until && (endDate === null || due <= endDate) && out.length < limit) {
    out.push(due);
    due = nextDueDate(rule, due);
  }
  return out;
}

export function defaultAnchorDay(frequency: Frequency, startDate: DateKey, weekdayOf: (key: DateKey) => number): number | null {
  if (frequency === 'weekly') return weekdayOf(startDate);
  if (frequency === 'monthly') return parseKey(startDate).day;
  return null;
}
