import type { Period } from '@studio/dates';
import { useLiveData } from '@/data/use-live-data';
import { readInsights } from './insights';

/** Id of the largest category in a period, or null. Pass `enabled: false` to skip the read. */
export function useTopCategoryId(period: Period, kind: 'expense' | 'income', enabled: boolean): string | null {
  return useLiveData(
    ['transactions', 'transaction_splits', 'categories', 'fx_rates', 'settings'],
    `${enabled}:${period.from}:${period.to}:${kind}`,
    (db) => (enabled ? (readInsights(db, period, kind).categories.find((c) => c.categoryId !== null)?.categoryId ?? null) : null),
  );
}
