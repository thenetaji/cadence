import type { Period } from "@studio/dates";
import { useLiveData } from "@/data/use-live-data";
import { scopeKey, type BreakdownBy, type InsightsScope } from "@/lib/insights";
import { readBreakdown, type Breakdown } from "./breakdown";

export type { Breakdown, BreakdownSlice, BreakdownTarget } from "./breakdown";

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
