import type { DateKey, Period, PeriodSettings } from "@studio/dates";
import { useLiveData } from "@/data/use-live-data";
import { scopeKey, type BreakdownBy, type InsightsScope } from "@/lib/insights";
import {
  readBreakdown,
  readMonthlyTrend,
  type Breakdown,
  type MonthlyTrend,
} from "./breakdown";

export type {
  Breakdown,
  BreakdownSlice,
  BreakdownTarget,
  MonthlyTrend,
  TrendSeries,
} from "./breakdown";

/** The selected period's total split by category, group, tag, account or merchant (Insights breakdown). */
export function useBreakdown(
  period: Period,
  kind: "expense" | "income",
  by: BreakdownBy,
  scope?: InsightsScope,
): Breakdown {
  return useLiveData(
    [
      "transactions",
      "transaction_splits",
      "transaction_tags",
      "categories",
      "tags",
      "accounts",
      "fx_rates",
      "settings",
    ],
    `${period.from}:${period.to}:${kind}:${by}:${scopeKey(scope)}`,
    (db) => readBreakdown(db, period, kind, by, scope),
  );
}

/** Months ending at `endRef`, stacked by the largest buckets of `by` (Insights monthly trend). */
export function useMonthlyTrend(
  endRef: DateKey,
  count: number,
  kind: "expense" | "income",
  by: BreakdownBy,
  settings: PeriodSettings,
  scope?: InsightsScope,
): MonthlyTrend {
  return useLiveData(
    [
      "transactions",
      "transaction_splits",
      "transaction_tags",
      "categories",
      "tags",
      "accounts",
      "fx_rates",
      "settings",
    ],
    `trend:${endRef}:${count}:${kind}:${by}:${settings.weekStart}:${settings.monthStart}:${scopeKey(scope)}`,
    (db) => readMonthlyTrend(db, endRef, count, kind, by, settings, scope),
  );
}
