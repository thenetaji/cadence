import { sumLines, type ConversionContext } from '@/lib/insights';
import { makeRateLookup } from '@/lib/money';
import { listRates } from '@/db/repos/fx';
import { spendLines } from '@/db/repos/reports';
import { getSetting } from '@/db/repos/settings';
import type { Db } from '@/db/types';

export interface PeriodSummary {
  currency: string;
  spent: number;
  earned: number;
}

export function conversionContext(db: Db): ConversionContext {
  return { displayCurrency: getSetting(db, 'display_currency'), rates: makeRateLookup(listRates(db)) };
}

export function readPeriodSummary(db: Db, period: { from: string; to: string }): PeriodSummary {
  const ctx = conversionContext(db);
  const lines = spendLines(db, period);
  return {
    currency: ctx.displayCurrency,
    spent: sumLines(lines, 'expense', period, ctx),
    earned: sumLines(lines, 'income', period, ctx),
  };
}
