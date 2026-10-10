import { listCategories } from "@/db/repos/categories";
import { spendLines } from "@/db/repos/reports";
import type { CategoryRow } from "@/db/schema";
import type { Db } from "@/db/types";
import {
  addDays,
  addMonths,
  previousPeriod,
  type DateKey,
  type Period,
} from "@studio/dates";
import {
  averageOf,
  buildSeries,
  categoryTotals,
  deltaVsPrevious,
  granularityFor,
  groupTopCategories,
  sumLines,
  type CategoryTotal,
  type Delta,
  type Granularity,
  type GroupedTotal,
  type InsightsScope,
  type SeriesPoint,
} from "@/lib/insights";
import { conversionContext } from "./summary";

export interface InsightCategory extends CategoryTotal {
  category: CategoryRow | null;
}

export interface InsightGroup extends GroupedTotal {
  category: CategoryRow | null;
}

export interface Insights {
  currency: string;
  kind: "expense" | "income";
  total: number;
  previousTotal: number;
  delta: Delta;
  /** Every category, largest first. */
  categories: InsightCategory[];
  /** Top 8 plus Other, for the donut. */
  donut: InsightGroup[];
  series: SeriesPoint[];
  /** The previous period in the same buckets, for running-total comparisons. */
  previousSeries: SeriesPoint[];
  /** The same stretch a year earlier (52 weeks for a week); null for a year, whose previous period already is. */
  yearAgoSeries: SeriesPoint[] | null;
  granularity: Granularity;
  average: number;
}

/** The same stretch of dates a year before `period`; weeks go back 52 weeks so weekdays line up. */
export function yearAgoRange(period: Period): { from: DateKey; to: DateKey } {
  if (period.type === "week")
    return { from: addDays(period.from, -364), to: addDays(period.to, -364) };
  return { from: addMonths(period.from, -12), to: addMonths(period.to, -12) };
}

export function readInsights(
  db: Db,
  period: Period,
  kind: "expense" | "income",
  todayKey?: DateKey,
  scope?: InsightsScope,
): Insights {
  const ctx = conversionContext(db);
  const previous = previousPeriod(period);
  const lines = spendLines(db, { from: previous.from, to: period.to }, scope);
  const byId = new Map(
    listCategories(db, kind, { includeArchived: true }).map((c) => [c.id, c]),
  );
  const attach = <T extends CategoryTotal>(row: T) => ({
    ...row,
    category: row.categoryId ? (byId.get(row.categoryId) ?? null) : null,
  });

  const totals = categoryTotals(lines, kind, period, ctx);
  const series = buildSeries(lines, kind, period, ctx);
  const total = sumLines(lines, kind, period, ctx);
  const previousTotal = sumLines(lines, kind, previous, ctx);
  return {
    currency: ctx.displayCurrency,
    kind,
    total,
    previousTotal,
    delta: deltaVsPrevious(total, previousTotal),
    categories: totals.map(attach),
    donut: groupTopCategories(totals, 8).map(attach),
    series,
    previousSeries: buildSeries(lines, kind, previous, ctx, {
      granularity: granularityFor(period),
    }),
    yearAgoSeries: yearAgoSeries(db, period, kind, ctx, scope),
    granularity: granularityFor(period),
    // Days that have not happened yet would only drag the daily average down.
    average: averageOf(
      granularityFor(period) === "day" &&
        todayKey &&
        todayKey >= period.from &&
        todayKey < period.to
        ? series.filter((p) => p.key <= todayKey)
        : series,
    ),
  };
}

function yearAgoSeries(
  db: Db,
  period: Period,
  kind: "expense" | "income",
  ctx: ReturnType<typeof conversionContext>,
  scope?: InsightsScope,
): SeriesPoint[] | null {
  if (period.type === "year") return null;
  const range = yearAgoRange(period);
  return buildSeries(
    spendLines(db, range, scope),
    kind,
    { ...period, ...range },
    ctx,
    { granularity: granularityFor(period) },
  );
}
