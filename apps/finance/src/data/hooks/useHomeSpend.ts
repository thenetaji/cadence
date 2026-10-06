import type { Period } from '@studio/dates';
import { useLiveData } from '../use-live-data';
import { readHomeSpend, type HomeSpend } from './homeSpend';

export type { HomeSpend, HomeSpendPoint } from './homeSpend';

/** This period's spend against the previous one at the same day, for the Home hero. */
export function useHomeSpend(period: Period, todayKey: string): HomeSpend {
  return useLiveData(
    ['transactions', 'transaction_splits', 'fx_rates', 'settings'],
    `${period.from}:${period.to}:${todayKey}`,
    (db) => readHomeSpend(db, period, todayKey),
  );
}
