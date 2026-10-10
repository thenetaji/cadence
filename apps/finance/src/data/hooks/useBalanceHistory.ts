import type { DateKey } from "@studio/dates";
import { useLiveData } from "@/data/use-live-data";
import type { HistoryRange } from "@/lib/balance/history";
import { readBalanceHistory, type BalanceHistory } from "./balanceHistory";

export type { BalanceHistory, BalancePoint } from "./balanceHistory";

/** Total balance over time (Accounts net worth chart); pass `accountId` for one account. */
export function useBalanceHistory(
  range: HistoryRange,
  todayKey: DateKey,
  accountId?: string,
): BalanceHistory {
  return useLiveData(
    ["accounts", "transactions", "fx_rates", "settings"],
    `${range}:${todayKey}:${accountId ?? ""}`,
    (db) => readBalanceHistory(db, range, todayKey, accountId),
  );
}
