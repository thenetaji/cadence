import type { DailyTotal } from "@/data/hooks";

export const HEAT_LEVELS = 6;

export interface CalendarCell {
  dateKey: string;
  day: number;
  amount: number;
  /** 0 = no spend, 1..6 = share of the month's largest day. */
  level: number;
}

export type CalendarRow = (CalendarCell | null)[];

/** Level 0 for no spend; otherwise `ceil(amount / max * 6)`, clamped to 1..6. */
export function heatLevel(amount: number, max: number): number {
  if (amount <= 0 || max <= 0) return 0;
  return Math.min(
    HEAT_LEVELS,
    Math.max(1, Math.ceil((amount / max) * HEAT_LEVELS)),
  );
}

/** Opacity of the brass fill for a heat level. */
export function heatOpacity(level: number): number {
  return level <= 0 ? 0 : 0.1 + (level / HEAT_LEVELS) * 0.62;
}

/** Number of empty cells before day 1 (`firstWeekday` 1 = Monday ... 7 = Sunday; `weekStart` 1 or 7). */
export function leadingBlanks(firstWeekday: number, weekStart: 1 | 7): number {
  return (((firstWeekday - weekStart) % 7) + 7) % 7;
}

/** Weeks as rows of seven; blank cells are null. */
export function buildMonthGrid(
  days: readonly DailyTotal[],
  max: number,
  firstWeekday: number,
  weekStart: 1 | 7,
): CalendarRow[] {
  const cells: CalendarRow = Array.from(
    { length: leadingBlanks(firstWeekday, weekStart) },
    () => null,
  );
  days.forEach((d, i) =>
    cells.push({
      dateKey: d.dateKey,
      day: i + 1,
      amount: d.amount,
      level: heatLevel(d.amount, max),
    }),
  );
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: CalendarRow[] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

const LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

/** Single-letter weekday headers starting at `weekStart`. */
export function weekdayLetters(weekStart: 1 | 7): string[] {
  const offset = weekStart === 7 ? 6 : 0;
  return Array.from(
    { length: 7 },
    (_, i) => LETTERS[(i + offset) % 7] as string,
  );
}

const pad = (n: number) => String(n).padStart(2, "0");

/** `YYYY-MM` of a date key. */
export function monthOf(dateKey: string): string {
  return dateKey.slice(0, 7);
}

/** Moves a `YYYY-MM` by whole months. */
export function shiftMonth(month: string, delta: number): string {
  const [y = 0, m = 1] = month.split("-").map(Number);
  const index = y * 12 + (m - 1) + delta;
  return `${Math.floor(index / 12)}-${pad((index % 12) + 1)}`;
}
