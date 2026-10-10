import type { DateKey, Period } from "@studio/dates";
import { useLiveData } from "@/data/use-live-data";
import { scopeKey, type InsightsScope } from "@/lib/insights";
import { readInsights, type Insights } from "./insights";

export type { Insights };

export function useInsights(
  period: Period,
  kind: "expense" | "income",
  todayKey?: DateKey,
  scope?: InsightsScope,
): Insights {
  return useLiveData(
    [
      "transactions",
      "transaction_splits",
      "categories",
      "transaction_tags",
      "fx_rates",
      "settings",
    ],
    `${period.type}:${period.from}:${period.to}:${kind}:${todayKey ?? ""}:${scopeKey(scope)}`,
    (db) => readInsights(db, period, kind, todayKey, scope),
  );
}
