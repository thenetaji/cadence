import type { Period } from "@studio/dates";
import { useLiveData } from "@/data/use-live-data";
import { scopeKey, type InsightsScope } from "@/lib/insights";
import {
  readCashFlow,
  readMonthlyTotals,
  type CashFlowData,
  type MonthlyTotalsData,
} from "./cashFlow";

export type { CashFlowData, MonthlyTotalsData } from "./cashFlow";

const TABLES = [
  "transactions",
  "transaction_splits",
  "transaction_tags",
  "fx_rates",
  "settings",
] as const;

/** Income and spending per day or month for the selected period (Insights "Cash flow"). */
export function useCashFlow(
  period: Period,
  scope?: InsightsScope,
): CashFlowData {
  return useLiveData(
    [...TABLES],
    `${period.type}:${period.from}:${period.to}:${scopeKey(scope)}`,
    (db) => readCashFlow(db, period, scope),
  );
}

/** Income and spending for each month in `periods` (Activity month chart), oldest first. */
export function useMonthlyTotals(
  periods: readonly Period[],
): MonthlyTotalsData {
  const key = periods.map((p) => p.from).join(",");
  return useLiveData([...TABLES], `monthly:${key}`, (db) =>
    readMonthlyTotals(db, periods),
  );
}
