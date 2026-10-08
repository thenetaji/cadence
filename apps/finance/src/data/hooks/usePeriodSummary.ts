import { useLiveData } from "@/data/use-live-data";
import { readPeriodSummary, type PeriodSummary } from "./summary";

export type { PeriodSummary };

/** Spent and earned for the period in the display currency; transfers excluded. */
export function usePeriodSummary(period: {
  from: string;
  to: string;
}): PeriodSummary {
  return useLiveData(
    ["transactions", "transaction_splits", "fx_rates", "settings"],
    `${period.from}:${period.to}`,
    (db) => readPeriodSummary(db, period),
  );
}
