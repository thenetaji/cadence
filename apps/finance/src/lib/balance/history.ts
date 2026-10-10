import {
  addDays,
  addMonths,
  diffDays,
  endOfMonthKey,
  listDays,
  parseKey,
  makeKey,
  type DateKey,
} from "@studio/dates";

/** Net change to one account's balance on one day, in the account's own currency. */
export interface Movement {
  accountId: string;
  dateKey: DateKey;
  delta: number;
}

export interface HistoryAccount {
  id: string;
  currency: string;
  openingBalance: number;
}

/** How far back the balance chart looks. */
export type HistoryRange = "3m" | "1y" | "all";

export const HISTORY_RANGES: readonly HistoryRange[] = ["3m", "1y", "all"];

/**
 * Bucket end days, oldest first, always ending on `todayKey`: daily for three months, weekly for a year,
 * monthly (each month's last day) for all time. "all" starting under three months ago falls back to days.
 */
export function historyBuckets(
  range: HistoryRange,
  todayKey: DateKey,
  firstKey: DateKey | null,
): DateKey[] {
  if (range === "3m") return listDays(addDays(todayKey, -89), todayKey);
  if (range === "1y") {
    const out: DateKey[] = [];
    for (let i = 52; i >= 0; i--) out.push(addDays(todayKey, -7 * i));
    return out;
  }
  const start = firstKey && firstKey < todayKey ? firstKey : todayKey;
  if (diffDays(start, todayKey) < 92) {
    // At least two points so there is a line to draw.
    const from = diffDays(start, todayKey) < 1 ? addDays(todayKey, -1) : start;
    return listDays(from, todayKey);
  }
  const out: DateKey[] = [];
  const { year, month: month0 } = parseKey(start);
  // The day before the first movement anchors the line at the opening balance.
  out.push(addDays(start, -1));
  for (let month = makeKey(year, month0, 1); ; month = addMonths(month, 1)) {
    const end = endOfMonthKey(month);
    if (end >= todayKey) break;
    out.push(end);
  }
  out.push(todayKey);
  return out;
}

/**
 * Total balance at the end of each bucket: opening balances plus every movement on or before the bucket's
 * day, each account converted by `convert` (null leaves the account out, e.g. no exchange rate).
 */
export function balanceHistory(
  accounts: readonly HistoryAccount[],
  movements: readonly Movement[],
  buckets: readonly DateKey[],
  convert: (amount: number, currency: string) => number | null,
): number[] {
  const byId = new Map(accounts.map((a) => [a.id, a]));
  const sorted = movements
    .filter((m) => byId.has(m.accountId))
    .sort((a, b) =>
      a.dateKey < b.dateKey ? -1 : a.dateKey > b.dateKey ? 1 : 0,
    );
  const running = new Map(accounts.map((a) => [a.id, a.openingBalance]));
  const total = () => {
    let sum = 0;
    for (const account of accounts) {
      const value = convert(running.get(account.id) ?? 0, account.currency);
      if (value !== null) sum += value;
    }
    return sum;
  };
  const out: number[] = [];
  let next = 0;
  for (const bucket of buckets) {
    while (next < sorted.length && sorted[next]!.dateKey <= bucket) {
      const m = sorted[next]!;
      running.set(m.accountId, (running.get(m.accountId) ?? 0) + m.delta);
      next++;
    }
    out.push(total());
  }
  return out;
}
