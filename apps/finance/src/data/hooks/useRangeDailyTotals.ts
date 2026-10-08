import { rangeDailyTotals, type RangeTotals } from "@/db/repos/calendar";
import { useLiveData } from "@/data/use-live-data";

/** Per-day totals from `from` to `to` inclusive, in the display currency. Transfers and lending excluded. */
export function useRangeDailyTotals(
  from: string,
  to: string,
  kind: "expense" | "income" = "expense",
): RangeTotals {
  return useLiveData(
    ["transactions", "transaction_splits", "fx_rates", "settings"],
    `${from}:${to}:${kind}`,
    (db) => rangeDailyTotals(db, from, to, kind),
  );
}

export type { RangeTotals } from "@/db/repos/calendar";
