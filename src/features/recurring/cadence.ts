import { monthShort, parseKey, weekday, type DateKey } from '@/lib/dates';
import type { Frequency } from '@/lib/recurring';

const WEEKDAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const UNITS: Record<Frequency, string> = { daily: 'days', weekly: 'weeks', monthly: 'months', yearly: 'years' };
const ADVERBS: Record<Frequency, string> = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' };

function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'}`;
}

export interface CadenceRule {
  frequency: Frequency;
  interval: number;
  anchorDay: number | null;
  startDate: DateKey;
}

/** "Monthly · 5th", "Every 2 weeks · Mon", "Yearly · 5 Mar", "Daily". */
export function cadenceSummary(rule: CadenceRule): string {
  const interval = Math.max(1, Math.trunc(rule.interval));
  const cadence = interval > 1 ? `Every ${interval} ${UNITS[rule.frequency]}` : ADVERBS[rule.frequency];
  const start = parseKey(rule.startDate);
  switch (rule.frequency) {
    case 'daily':
      return cadence;
    case 'weekly':
      return `${cadence} · ${WEEKDAYS_SHORT[(rule.anchorDay ?? weekday(rule.startDate)) - 1] ?? ''}`;
    case 'monthly':
      return `${cadence} · ${ordinal(rule.anchorDay ?? start.day)}`;
    case 'yearly':
      return `${cadence} · ${start.day} ${monthShort(start.month)}`;
  }
}

/** "5 Nov" style short date for rows and chips. */
export function shortDate(key: DateKey): string {
  const { day, month } = parseKey(key);
  return `${day} ${monthShort(month)}`;
}
