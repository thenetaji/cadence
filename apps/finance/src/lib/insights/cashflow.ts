import type { DateKey, Period } from "@studio/dates";
import {
  buildSeries,
  convertLine,
  granularityFor,
  type ConversionContext,
  type Granularity,
} from "./aggregate";
import type { MonthlyPair } from "./extras";
import type { FlatLine } from "./types";

export interface CashFlowPoint {
  /** Day key, or the first-of-month key for monthly buckets. */
  key: DateKey;
  income: number;
  spent: number;
  /** income minus spent for this bucket. */
  net: number;
}

export interface CashFlow {
  granularity: Granularity;
  points: CashFlowPoint[];
  totalIn: number;
  totalOut: number;
}

/** Income and spending side by side per day (week, month) or per month (year, long ranges). */
export function cashFlowSeries(
  lines: readonly FlatLine[],
  period: Period,
  ctx: ConversionContext,
): CashFlow {
  const granularity = granularityFor(period);
  const incomes = buildSeries(lines, "income", period, ctx, { granularity });
  const spends = buildSeries(lines, "expense", period, ctx, { granularity });
  const points = incomes.map((p, i) => {
    const spent = spends[i]?.amount ?? 0;
    return { key: p.key, income: p.amount, spent, net: p.amount - spent };
  });
  return {
    granularity,
    points,
    totalIn: points.reduce((s, p) => s + p.income, 0),
    totalOut: points.reduce((s, p) => s + p.spent, 0),
  };
}

/** Income and spending for each of `periods` (oldest first), in the display currency. */
export function monthlyTotals(
  lines: readonly FlatLine[],
  periods: readonly Pick<Period, "from" | "to">[],
  ctx: ConversionContext,
): MonthlyPair[] {
  return periods.map((p) => {
    let income = 0;
    let spent = 0;
    for (const line of lines) {
      if (line.dateKey < p.from || line.dateKey > p.to) continue;
      if (line.kind === "income") income += convertLine(line, ctx);
      else spent += convertLine(line, ctx);
    }
    return { key: p.from, from: p.from, to: p.to, income, spent };
  });
}
