import { addDays, monthShort, parseKey, weekday } from '@studio/dates';

import { HEAT_LEVELS } from '@/features/calendar/grid';

export interface HeatCell {
  dateKey: string;
  amount: number;
  /** 0 = nothing spent, 1..HEAT_LEVELS. */
  level: number;
  /** After today: drawn as an empty slot, not as a quiet day. */
  future: boolean;
}

export interface HeatColumn {
  /** Seven slots, top = first day of the week. */
  cells: HeatCell[];
  /** Short month name when this week holds the 1st of a month (or is the first column, unless the next label is close), else null. */
  monthLabel: string | null;
}

export interface HeatmapModel {
  columns: HeatColumn[];
  /** Inclusive range covered by the grid. */
  from: string;
  to: string;
  /** Spend scale used for the levels (a high percentile, so one rent payment does not wash out the rest). */
  scale: number;
  activeDays: number;
  /** Average spend per weekday over the range, index 0 = first day of the week. */
  weekdayAverages: number[];
  /** Index (0 = first day of the week) of the weekday with the highest average, or null when nothing was spent. */
  busiestWeekday: number | null;
}

/** First day of the grid: the start of the week `weeks - 1` weeks before the week containing `today`. */
export function heatmapStart(today: string, weeks: number, weekStart: 1 | 7): string {
  const offset = (((weekday(today) - weekStart) % 7) + 7) % 7;
  return addDays(today, -offset - (weeks - 1) * 7);
}

/** Last day of the grid: the end of the week containing `today`. */
export function heatmapEnd(today: string, weekStart: 1 | 7): string {
  const offset = (((weekday(today) - weekStart) % 7) + 7) % 7;
  return addDays(today, 6 - offset);
}

/**
 * The value treated as "full heat": the given percentile of non-zero days (nearest rank). Keeps a single
 * outlier from flattening every other day into level 1.
 */
export function heatScale(amounts: readonly number[], percentile = 0.9): number {
  const spent = amounts.filter((a) => a > 0).sort((a, b) => a - b);
  if (spent.length === 0) return 0;
  const rank = Math.min(spent.length - 1, Math.max(0, Math.ceil(percentile * spent.length) - 1));
  return spent[rank] as number;
}

export function heatLevelFor(amount: number, scale: number): number {
  if (amount <= 0 || scale <= 0) return 0;
  return Math.min(HEAT_LEVELS, Math.max(1, Math.ceil((amount / scale) * HEAT_LEVELS)));
}

/**
 * Lays per-day totals out as week columns (GitHub-contribution style). `days` must start on a week start and
 * be contiguous; days after `today` are marked future.
 */
export function buildHeatmap(days: readonly { dateKey: string; amount: number }[], today: string): HeatmapModel {
  const past = days.filter((d) => d.dateKey <= today);
  const scale = heatScale(past.map((d) => d.amount));
  const columns: HeatColumn[] = [];
  const sums = Array.from({ length: 7 }, () => 0);
  const counts = Array.from({ length: 7 }, () => 0);
  let lastMonth = -1;
  for (let i = 0; i < days.length; i += 7) {
    const week = days.slice(i, i + 7);
    const cells = week.map((d, slot) => {
      const future = d.dateKey > today;
      if (!future) {
        sums[slot] = (sums[slot] as number) + d.amount;
        counts[slot] = (counts[slot] as number) + 1;
      }
      return { dateKey: d.dateKey, amount: future ? 0 : d.amount, level: future ? 0 : heatLevelFor(d.amount, scale), future };
    });
    const firstOfMonth = week.find((d) => parseKey(d.dateKey).day === 1);
    const month = parseKey((firstOfMonth ?? week[0] ?? { dateKey: today }).dateKey).month;
    const label = i === 0 || (firstOfMonth && month !== lastMonth) ? monthShort(month) : null;
    if (label) lastMonth = month;
    columns.push({ cells, monthLabel: label });
  }
  // A partial first month whose label would collide with the next month's label loses it.
  if (columns[0]?.monthLabel && columns.slice(1, 3).some((c) => c.monthLabel)) columns[0] = { ...columns[0], monthLabel: null };
  const weekdayAverages = sums.map((sum, i) => ((counts[i] as number) > 0 ? Math.round(sum / (counts[i] as number)) : 0));
  const top = Math.max(...weekdayAverages);
  return {
    columns,
    from: days[0]?.dateKey ?? today,
    to: days[days.length - 1]?.dateKey ?? today,
    scale,
    activeDays: past.filter((d) => d.amount > 0).length,
    weekdayAverages,
    busiestWeekday: top > 0 ? weekdayAverages.indexOf(top) : null,
  };
}

/** Number of whole weeks that fit `width` with the given cell size and gap. */
export function weeksThatFit(width: number, cell: number, gap: number, max = 26): number {
  if (width <= 0) return 0;
  return Math.max(1, Math.min(max, Math.floor((width + gap) / (cell + gap))));
}
