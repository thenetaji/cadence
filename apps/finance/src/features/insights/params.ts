import {
  customPeriod,
  nextPeriod,
  periodFor,
  previousPeriod,
  type DateKey,
  type Period,
  type PeriodSettings,
  type PeriodType,
} from "@studio/dates";
import {
  BREAKDOWN_BYS,
  type BreakdownBy,
  type InsightsScope,
} from "@/lib/insights";

/** `both` shows spending and income together; it is the default. */
export type InsightsKind = "both" | "expense" | "income";

/** The kind a single-kind read (hooks, category screens) uses: `both` reads spending. */
export const singleKind = (kind: InsightsKind): "expense" | "income" =>
  kind === "income" ? "income" : "expense";

export interface InsightsView {
  type: PeriodType;
  /** Any date inside the shown period; ignored for custom. */
  anchor: DateKey;
  custom: { from: DateKey; to: DateKey } | null;
  kind: InsightsKind;
}

export interface InsightsParams {
  period?: string;
  kind?: string;
  offset?: string;
  from?: string;
  to?: string;
  select?: string;
  /** Breakdown dimension: category, group, tag, account or merchant. */
  by?: string;
  /** Account id to narrow to. */
  account?: string;
  /** Tag id to narrow to. */
  tag?: string;
}

const KEY = /^\d{4}-\d{2}-\d{2}$/;
const PERIODS: readonly PeriodType[] = ["week", "month", "year", "custom"];

export function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Initial view from route params. Unknown or malformed values fall back to the defaults. */
export function parseInsightsParams(
  params: InsightsParams,
  today: DateKey,
  settings: PeriodSettings,
): { view: InsightsView; select: string | null } {
  const asType = PERIODS.find((p) => p === params.period);
  const hasRange =
    params.from !== undefined &&
    params.to !== undefined &&
    KEY.test(params.from) &&
    KEY.test(params.to);
  const type: PeriodType =
    asType === "custom" && !hasRange ? "month" : (asType ?? "month");
  const kind: InsightsKind =
    params.kind === "income"
      ? "income"
      : params.kind === "expense"
        ? "expense"
        : "both";
  const offset = Math.max(
    -120,
    Math.min(0, Number.parseInt(params.offset ?? "0", 10) || 0),
  );
  let anchor = today;
  if (type !== "custom") {
    let period = periodFor(type, today, settings);
    for (let i = 0; i > offset; i--) period = previousPeriod(period);
    anchor = period.from;
  }
  const custom =
    type === "custom" && hasRange
      ? { from: params.from as DateKey, to: params.to as DateKey }
      : null;
  return {
    view: { type, anchor, custom, kind },
    select: params.select ? params.select : null,
  };
}

export function periodOf(view: InsightsView, settings: PeriodSettings): Period {
  if (view.type === "custom" && view.custom)
    return customPeriod(view.custom.from, view.custom.to);
  return periodFor(
    view.type === "custom" ? "month" : view.type,
    view.anchor,
    settings,
  );
}

/** The view after stepping one period; custom ranges slide by their own length. */
export function stepView(
  view: InsightsView,
  direction: 1 | -1,
  settings: PeriodSettings,
): InsightsView {
  const current = periodOf(view, settings);
  const next = direction === 1 ? nextPeriod(current) : previousPeriod(current);
  if (view.type === "custom")
    return { ...view, custom: { from: next.from, to: next.to } };
  return { ...view, anchor: next.from };
}

/** Stepping forward past the period that contains today is pointless: there is no data. */
export function canStepForward(
  view: InsightsView,
  today: DateKey,
  settings: PeriodSettings,
): boolean {
  return periodOf(view, settings).to < today;
}

/** `?by=` as a breakdown dimension; anything else is the category breakdown. */
export function parseBreakdownBy(value: string | undefined): BreakdownBy {
  return BREAKDOWN_BYS.find((by) => by === value) ?? "category";
}

/** `?account=` and `?tag=` as a scope; blank values mean everything. */
export function parseScope(params: InsightsParams): InsightsScope {
  return {
    accountId: firstParam(params.account) || null,
    tagId: firstParam(params.tag) || null,
  };
}
