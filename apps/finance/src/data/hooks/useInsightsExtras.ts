import type { DateKey, Period, PeriodSettings } from '@studio/dates';
import { useLiveData } from '@/data/use-live-data';
import { readInsightsExtras, type InsightsExtras } from './insightsExtras';

export type { InsightsExtras };

/** Stats, weekday, merchant, account and six-month figures that sit under the main Insights charts. */
export function useInsightsExtras(period: Period, kind: 'expense' | 'income', settings: PeriodSettings, todayKey?: DateKey): InsightsExtras {
  return useLiveData(
    ['transactions', 'transaction_splits', 'categories', 'accounts', 'fx_rates', 'settings'],
    `${period.type}:${period.from}:${period.to}:${kind}:${settings.weekStart}:${settings.monthStart}:${todayKey ?? ''}`,
    (db) => readInsightsExtras(db, period, kind, settings, todayKey),
  );
}
