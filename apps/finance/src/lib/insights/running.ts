import type { DateKey } from "@studio/dates";
import type { SeriesPoint } from "./aggregate";

export interface RunningComparison {
  /** Running total for the current period; null for buckets after today. */
  current: (number | null)[];
  /** Running total for the previous period, bucket by bucket (day 1 against day 1). */
  previous: number[];
  /** Index of the last counted bucket in the current period, or -1 when none has started. */
  todayIndex: number;
  /** Current minus previous at `todayIndex`; null when there is nothing to compare. */
  difference: number | null;
}

/**
 * Running totals for this period against the last one, aligned by position so day 12 meets day 12
 * (and the 31st of a long month meets the previous month's last day when it has fewer).
 */
export function runningComparison(
  current: readonly SeriesPoint[],
  previous: readonly SeriesPoint[],
  todayKey?: DateKey,
): RunningComparison {
  const length = Math.max(current.length, previous.length);
  const out: RunningComparison = {
    current: [],
    previous: [],
    todayIndex: -1,
    difference: null,
  };
  let now = 0;
  let before = 0;
  for (let i = 0; i < length; i++) {
    const point = current[i];
    before += previous[i]?.amount ?? 0;
    out.previous.push(before);
    if (point && (todayKey === undefined || point.key <= todayKey)) {
      now += point.amount;
      out.current.push(now);
      out.todayIndex = i;
    } else out.current.push(null);
  }
  if (out.todayIndex >= 0 && previous.length > 0) {
    const atSameDay =
      out.previous[Math.min(out.todayIndex, previous.length - 1)] ?? 0;
    out.difference = now - atSameDay;
  }
  return out;
}
