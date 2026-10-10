import { listAccounts } from "@/db/repos/accounts";
import { listCategories } from "@/db/repos/categories";
import { detailedLines } from "@/db/repos/insight-lines";
import type { AccountRow, CategoryRow } from "@/db/schema";
import type { Db } from "@/db/types";
import type { DateKey, Period, PeriodSettings } from "@studio/dates";
import {
  biggest,
  byAccount,
  dailyAverage,
  extrasRange,
  pairedMonthly,
  peakIndex,
  savingsRate,
  sumLines,
  topTitles,
  transactionTotals,
  weekdayAverages,
  type AccountTotal,
  type MonthlyPair,
  type TitleTotal,
  type TransactionTotal,
  type WeekdayAverage,
  type InsightsScope,
} from "@/lib/insights";
import { conversionContext } from "./summary";

export interface ExtrasBiggest extends TransactionTotal {
  category: CategoryRow | null;
}
export interface ExtrasMerchant extends TitleTotal {
  category: CategoryRow | null;
}
export interface ExtrasAccount extends AccountTotal {
  account: AccountRow | null;
}

export interface InsightsExtras {
  currency: string;
  kind: "expense" | "income";
  /** Always both kinds, for the savings rate. */
  spent: number;
  earned: number;
  /** Whole percent, null when nothing was earned. */
  savingsRate: number | null;
  /** Mean per elapsed day for the selected kind. */
  dailyAverage: number;
  transactionCount: number;
  biggest: ExtrasBiggest | null;
  /** Ordered from the week start. */
  weekdays: WeekdayAverage[];
  peakWeekday: number | null;
  merchants: ExtrasMerchant[];
  accounts: ExtrasAccount[];
  /** Six months ending at the selected period, oldest first. */
  monthly: MonthlyPair[];
}

export function readInsightsExtras(
  db: Db,
  period: Period,
  kind: "expense" | "income",
  settings: PeriodSettings,
  todayKey?: DateKey,
  scope?: InsightsScope,
): InsightsExtras {
  const ctx = conversionContext(db);
  // The trend ends at the period's last month, or the current month when the period is still running.
  const endRef =
    todayKey && todayKey >= period.from && todayKey < period.to
      ? todayKey
      : period.to;
  const lines = detailedLines(db, extrasRange(period, endRef, settings), scope);
  const categories = new Map(
    listCategories(db, undefined, { includeArchived: true }).map((c) => [
      c.id,
      c,
    ]),
  );
  const accounts = new Map(
    listAccounts(db, { includeArchived: true }).map((a) => [a.id, a]),
  );
  const category = (id: string | null) =>
    id ? (categories.get(id) ?? null) : null;

  const total = sumLines(lines, kind, period, ctx);
  const spent = sumLines(lines, "expense", period, ctx);
  const earned = sumLines(lines, "income", period, ctx);
  const transactions = transactionTotals(lines, kind, period, ctx);
  const big = biggest(lines, kind, period, ctx);
  const weekdays = weekdayAverages(
    lines,
    kind,
    period,
    settings.weekStart,
    ctx,
    todayKey,
  );
  return {
    currency: ctx.displayCurrency,
    kind,
    spent,
    earned,
    savingsRate: savingsRate(earned, spent),
    dailyAverage: dailyAverage(total, period, todayKey),
    transactionCount: transactions.length,
    biggest: big ? { ...big, category: category(big.categoryId) } : null,
    weekdays,
    peakWeekday: peakIndex(weekdays.map((d) => d.average)),
    merchants: topTitles(lines, kind, period, ctx, 5).map((m) => ({
      ...m,
      category: category(m.categoryId),
    })),
    accounts: byAccount(lines, kind, period, ctx).map((a) => ({
      ...a,
      account: accounts.get(a.accountId) ?? null,
    })),
    monthly: pairedMonthly(lines, endRef, settings, ctx, 6),
  };
}
