import type { Period } from '@studio/dates';
import { useLiveData } from '@/data/use-live-data';
import { readCategoryTrend, type CategoryTrend } from './categoryTrend';

export type { CategoryTrend, TrendPoint } from './categoryTrend';

/** Last 6 periods of one category (same period type), for the drill-down bars. */
export function useCategoryTrend(categoryId: string, period: Period, kind: 'expense' | 'income'): CategoryTrend {
  return useLiveData(
    ['transactions', 'transaction_splits', 'categories', 'fx_rates', 'settings'],
    `${categoryId}:${period.type}:${period.from}:${period.to}:${kind}`,
    (db) => readCategoryTrend(db, categoryId, period, kind),
  );
}
