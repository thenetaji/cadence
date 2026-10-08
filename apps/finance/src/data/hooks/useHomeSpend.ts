import type { Period } from "@studio/dates";
import { useLiveData } from "@/data/use-live-data";
import {
  readAllTime,
  readHomeSpend,
  type AllTimeSpend,
  type HomeSpend,
} from "./homeSpend";

export type {
  AllTimeMonth,
  AllTimeSpend,
  HomeSpend,
  HomeSpendPoint,
} from "./homeSpend";

/** This period's spend against the previous one at the same day, for the Home hero. */
export function useHomeSpend(period: Period, todayKey: string): HomeSpend {
  return useLiveData(
    ["transactions", "transaction_splits", "fx_rates", "settings"],
    `${period.from}:${period.to}:${todayKey}`,
    (db) => readHomeSpend(db, period, todayKey),
  );
}

/** Every month since the first transaction, for the Home hero's "All time" view. */
export function useAllTimeSpend(todayKey: string): AllTimeSpend {
  return useLiveData(
    ["transactions", "transaction_splits", "fx_rates", "settings"],
    todayKey,
    (db) => readAllTime(db, todayKey),
  );
}
