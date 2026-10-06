import { diffDays, parseKey, type DateKey, type Period } from '@studio/dates';
import type { BudgetPeriod, BudgetRow } from '@/db/schema';

export type BudgetStatus = 'ok' | 'warning' | 'over';

/** Warning starts at 90% of the amount; over means strictly more than the amount. */
export const WARNING_RATIO = 0.9;

export function budgetRatio(spent: number, amount: number): number {
  if (amount <= 0) return 0;
  return Math.max(0, spent) / amount;
}

export function budgetStatus(spent: number, amount: number): BudgetStatus {
  const ratio = budgetRatio(spent, amount);
  if (ratio > 1) return 'over';
  if (ratio >= WARNING_RATIO) return 'warning';
  return 'ok';
}

/** Days still to spend in, today included; the whole period when it hasn't started, 0 once it has ended. */
export function daysLeft(period: Pick<Period, 'from' | 'to'>, todayKey: DateKey): number {
  if (todayKey > period.to) return 0;
  if (todayKey < period.from) return diffDays(period.from, period.to) + 1;
  return diffDays(todayKey, period.to) + 1;
}

/** Today's position in the period, 0-1 (middle of today), for the pace tick; undefined when today is outside it. */
export function paceMarker(period: Pick<Period, 'from' | 'to'>, todayKey: DateKey): number | undefined {
  if (todayKey < period.from || todayKey > period.to) return undefined;
  const length = diffDays(period.from, period.to) + 1;
  return (diffDays(period.from, todayKey) + 0.5) / length;
}

/** What's left spread evenly over the remaining days (minor units, rounded down); 0 when over or out of days. */
export function perDayLeft(remaining: number, period: Pick<Period, 'from' | 'to'>, todayKey: DateKey): number {
  const days = daysLeft(period, todayKey);
  if (remaining <= 0 || days <= 0) return 0;
  return Math.floor(remaining / days);
}

export const PERIOD_VALUES: readonly BudgetPeriod[] = ['weekly', 'monthly', 'yearly'];
export const PERIOD_LABELS = ['Weekly', 'Monthly', 'Yearly'] as const;

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const weekdayName = (n: number): string => WEEKDAYS[n - 1] ?? '';

export function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

/** Value of the "Starts" row: a weekday, a day of the month or a month. */
export function anchorLabel(period: BudgetPeriod, anchor: number): string {
  if (period === 'weekly') return weekdayName(anchor);
  if (period === 'monthly') return ordinal(anchor);
  return MONTHS[anchor - 1] ?? '';
}

export function anchorOptions(period: BudgetPeriod): { value: number; label: string }[] {
  const count = period === 'weekly' ? 7 : period === 'monthly' ? 28 : 12;
  return Array.from({ length: count }, (_, i) => ({ value: i + 1, label: anchorLabel(period, i + 1) }));
}

/** Settings supply the starting anchor: week start, month start, January. */
export function defaultAnchor(period: BudgetPeriod, settings: { weekStart: number; monthStart: number }): number {
  if (period === 'weekly') return settings.weekStart;
  if (period === 'monthly') return settings.monthStart;
  return 1;
}

export const periodTitle = (period: BudgetPeriod): string => ({ weekly: 'This week', monthly: 'This month', yearly: 'This year' })[period];

/** Footnote above a budget card: "This month" now, the month's name (or year) once it is not the current period. */
export function periodCaption(period: BudgetPeriod, range: Pick<Period, 'from' | 'to'>, current: boolean): string {
  if (current) return periodTitle(period);
  const { year, month } = parseKey(range.from);
  if (period === 'monthly') return MONTHS[month - 1] ?? '';
  if (period === 'yearly') return String(year);
  return `Week of ${parseKey(range.from).day} ${(MONTHS[month - 1] ?? '').slice(0, 3)}`;
}

const GENERIC_NAME = /^(Weekly|Monthly|Yearly) budget$/;

/** Stored name, except that a generic default on a category budget reads as its categories ("Food & Drink +1"). */
export function displayName(budget: Pick<BudgetRow, 'name' | 'scope'>, categoryNames: readonly string[]): string {
  if (budget.scope === 'categories' && GENERIC_NAME.test(budget.name) && categoryNames.length > 0) {
    const [first = ''] = categoryNames;
    return categoryNames.length === 1 ? first : `${first} +${categoryNames.length - 1}`;
  }
  return budget.name;
}

/** Name to prefill in the form: empty when it is only the generic default. */
export function editableName(budget: Pick<BudgetRow, 'name'>): string {
  return GENERIC_NAME.test(budget.name) ? '' : budget.name;
}
