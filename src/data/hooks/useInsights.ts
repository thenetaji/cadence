import type { Period } from '@/lib/dates';
import { useLiveData } from '../use-live-data';
import { readInsights, type Insights } from './insights';

export type { Insights };

export function useInsights(period: Period, kind: 'expense' | 'income'): Insights {
  return useLiveData(
    ['transactions', 'transaction_splits', 'categories', 'fx_rates', 'settings'],
    `${period.type}:${period.from}:${period.to}:${kind}`,
    (db) => readInsights(db, period, kind),
  );
}
