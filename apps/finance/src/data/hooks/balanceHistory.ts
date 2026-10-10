import { balanceMovements, listAccounts } from "@/db/repos/accounts";
import { getRateLookup } from "@/db/repos/fx";
import { getSetting } from "@/db/repos/settings";
import type { Db } from "@/db/types";
import type { DateKey } from "@studio/dates";
import { convertWithRates } from "@studio/money";
import {
  balanceHistory,
  historyBuckets,
  type HistoryRange,
} from "@/lib/balance/history";

export interface BalancePoint {
  /** Bucket end day. */
  key: DateKey;
  value: number;
}

export interface BalanceHistory {
  currency: string;
  /** Oldest first; the last point is today. */
  points: BalancePoint[];
  /** Last minus first. */
  change: number;
}

/**
 * Total balance over time: one account in its own currency, or every active account in the display
 * currency (accounts without an exchange rate are left out, as in the Accounts total).
 */
export function readBalanceHistory(
  db: Db,
  range: HistoryRange,
  todayKey: DateKey,
  accountId?: string,
): BalanceHistory {
  const all = listAccounts(db, { includeArchived: accountId !== undefined });
  const accounts = accountId ? all.filter((a) => a.id === accountId) : all;
  const movements = balanceMovements(db);
  const first = movements.reduce<DateKey | null>(
    (min, m) =>
      accounts.some((a) => a.id === m.accountId) &&
      (min === null || m.dateKey < min)
        ? m.dateKey
        : min,
    null,
  );
  const displayCurrency = getSetting(db, "display_currency");
  const currency = accountId
    ? (accounts[0]?.currency ?? displayCurrency)
    : displayCurrency;
  const rates = getRateLookup(db);
  const buckets = historyBuckets(range, todayKey, first);
  const values = balanceHistory(accounts, movements, buckets, (amount, from) =>
    from === currency
      ? amount
      : rates(from, currency) === null
        ? null
        : convertWithRates(amount, from, currency, rates),
  );
  const points = buckets.map((key, i) => ({ key, value: values[i] ?? 0 }));
  return {
    currency,
    points,
    change: (values[values.length - 1] ?? 0) - (values[0] ?? 0),
  };
}
