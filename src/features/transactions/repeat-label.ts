import { monthShort, parseKey, type DateKey } from '@/lib/dates';

const UNITS = { daily: ['day', 'days'], weekly: ['week', 'weeks'], monthly: ['month', 'months'], yearly: ['year', 'years'] } as const;
const ADVERBS = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' } as const;

export type RepeatFrequency = keyof typeof ADVERBS;

/** "Monthly · next 3 Nov" or "Every 2 weeks · next 3 Nov". */
export function repeatLabel(rule: { frequency: RepeatFrequency; interval: number; nextDue: DateKey }): string {
  const cadence = rule.interval > 1 ? `Every ${rule.interval} ${UNITS[rule.frequency][1]}` : ADVERBS[rule.frequency];
  const { day, month } = parseKey(rule.nextDue);
  return `${cadence} · next ${day} ${monthShort(month)}`;
}
