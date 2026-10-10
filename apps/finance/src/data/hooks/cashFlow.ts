import { spendLines } from "@/db/repos/reports";
import type { Db } from "@/db/types";
import type { Period } from "@studio/dates";
import {
  cashFlowSeries,
  monthlyTotals,
  type CashFlow,
  type MonthlyPair,
  type InsightsScope,
} from "@/lib/insights";
import { conversionContext } from "./summary";

export interface CashFlowData extends CashFlow {
  currency: string;
}

export interface MonthlyTotalsData {
  currency: string;
  /** Oldest first. */
  months: MonthlyPair[];
}

export function readCashFlow(
  db: Db,
  period: Period,
  scope?: InsightsScope,
): CashFlowData {
  const ctx = conversionContext(db);
  return {
    currency: ctx.displayCurrency,
    ...cashFlowSeries(
      spendLines(db, { from: period.from, to: period.to }, scope),
      period,
      ctx,
    ),
  };
}

/** `periods` may be in any order; the result is oldest first. */
export function readMonthlyTotals(
  db: Db,
  periods: readonly Period[],
): MonthlyTotalsData {
  const ctx = conversionContext(db);
  const sorted = [...periods].sort((a, b) => (a.from < b.from ? -1 : 1));
  if (sorted.length === 0) return { currency: ctx.displayCurrency, months: [] };
  const lines = spendLines(db, {
    from: sorted[0]!.from,
    to: sorted[sorted.length - 1]!.to,
  });
  return {
    currency: ctx.displayCurrency,
    months: monthlyTotals(lines, sorted, ctx),
  };
}
