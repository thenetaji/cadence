import { dailyTotals, type DailyTotals } from '@/db/repos/calendar';
import { useLiveData } from '../use-live-data';

/** Per-day totals for the calendar month containing `month` (`YYYY-MM` or a date key). Transfers and lending excluded. */
export function useDailyTotals(month: string, kind: 'expense' | 'income' = 'expense'): DailyTotals {
  return useLiveData(['transactions', 'transaction_splits', 'fx_rates', 'settings'], `${month}:${kind}`, (db) => dailyTotals(db, month, kind));
}

export type { DailyTotal, DailyTotals } from '@/db/repos/calendar';
