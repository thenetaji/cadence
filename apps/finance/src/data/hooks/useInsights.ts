import type { DateKey, Period } from '@studio/dates';
import { useLiveData } from '@/data/use-live-data';
import { readInsights, type Insights } from './insights';

export type { Insights };

export function useInsights(period: Period, kind: 'expense' | 'income', todayKey?: DateKey): Insights {
  return useLiveData(
    ['transactions', 'transaction_splits', 'categories', 'fx_rates', 'settings'],
    `${period.type}:${period.from}:${period.to}:${kind}:${todayKey ?? ''}`,
    (db) => readInsights(db, period, kind, todayKey),
  );
}
