import { monthShort, parseKey, weekday, type DateKey } from '@/lib/dates';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export interface AxisLabel {
  index: number;
  text: string;
}

/**
 * Which x labels to draw under a bar chart: every weekday for a week, a sparse set of day
 * numbers for longer day series, month names for monthly series. Never more than ~6 labels.
 */
export function axisLabels(keys: readonly DateKey[], granularity: 'day' | 'month'): AxisLabel[] {
  const n = keys.length;
  if (n === 0) return [];
  if (granularity === 'month') {
    const step = n <= 12 ? (n <= 6 ? 1 : 2) : Math.ceil(n / 6);
    return keys.flatMap((key, index) =>
      index % step === 0 ? [{ index, text: monthShort(parseKey(key).month) }] : [],
    );
  }
  if (n <= 7) return keys.map((key, index) => ({ index, text: WEEKDAYS[weekday(key) - 1] ?? '' }));
  const step = n <= 14 ? 2 : n <= 31 ? 7 : Math.ceil(n / 5);
  const out: AxisLabel[] = [];
  for (let index = 0; index < n; index += step) {
    // Keep the last label from crowding the final bar.
    if (n - index < step / 2 + 1 && out.length > 0) break;
    const { day, month } = parseKey(keys[index]!);
    out.push({ index, text: n > 31 || day === 1 ? `${day} ${monthShort(month)}` : String(day) });
  }
  return out;
}

/** Day-of-month for a scrub label: "Tue 7". */
export function shortDay(key: DateKey): string {
  return `${WEEKDAYS[weekday(key) - 1]} ${parseKey(key).day}`;
}
