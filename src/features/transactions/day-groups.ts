import type { TransactionListItem } from '@/data/hooks';
import { dayLabel } from '@/lib/dates';
import { convertWithRates, formatMoney, type RateLookup } from '@/lib/money';

export interface DayGroupContext {
  todayKey: string;
  displayCurrency: string;
  locale?: string;
  showDecimals: boolean;
  rates: RateLookup;
}

export type ListEntry =
  | { type: 'header'; key: string; label: string; total?: string }
  | { type: 'row'; key: string; item: TransactionListItem; last: boolean };

export interface Totals {
  spent: number;
  earned: number;
}

/** Spent and earned in the display currency; only expenses and income count (transfers and lending are excluded, as on Home) and unknown rates stay unconverted. */
export function sumItems(items: readonly TransactionListItem[], ctx: Pick<DayGroupContext, 'displayCurrency' | 'rates'>): Totals {
  const totals: Totals = { spent: 0, earned: 0 };
  for (const item of items) {
    if (item.kind !== 'expense' && item.kind !== 'income') continue;
    const value = convertWithRates(item.amount, item.currency, ctx.displayCurrency, ctx.rates);
    if (item.kind === 'expense') totals.spent += value;
    else totals.earned += value;
  }
  return totals;
}

/** Flattens newest-first items into day headers (with a net total) followed by their rows. */
export function buildDayEntries(items: readonly TransactionListItem[], ctx: DayGroupContext): ListEntry[] {
  const out: ListEntry[] = [];
  let start = 0;
  while (start < items.length) {
    const dateKey = (items[start] as TransactionListItem).dateKey;
    let end = start;
    while (end < items.length && (items[end] as TransactionListItem).dateKey === dateKey) end++;
    const day = items.slice(start, end);
    const hasMoney = day.some((i) => i.kind === 'expense' || i.kind === 'income');
    let total: string | undefined;
    if (hasMoney) {
      const { spent, earned } = sumItems(day, ctx);
      total = formatMoney(earned - spent, ctx.displayCurrency, {
        locale: ctx.locale,
        sign: 'auto',
        decimals: ctx.showDecimals ? undefined : 0,
      });
      if (earned - spent > 0) total = `+${total}`;
    }
    out.push({ type: 'header', key: `h:${dateKey}`, label: dayLabel(dateKey, ctx.todayKey), total });
    day.forEach((item, index) => out.push({ type: 'row', key: item.id, item, last: index === day.length - 1 }));
    start = end;
  }
  return out;
}

/** Indices of header entries, for sticky headers. */
export function headerIndices(entries: readonly ListEntry[]): number[] {
  const out: number[] = [];
  entries.forEach((entry, index) => {
    if (entry.type === 'header') out.push(index);
  });
  return out;
}
