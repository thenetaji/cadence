import { listAccounts } from "@/db/repos/accounts";
import { listCategories } from "@/db/repos/categories";
import { detailedLines } from "@/db/repos/insight-lines";
import { tagLinks } from "@/db/repos/reports";
import { listTags } from "@/db/repos/tags";
import type { CategoryRow } from "@/db/schema";
import type { Db } from "@/db/types";
import type { DateKey, Period, PeriodSettings } from "@studio/dates";
import {
  KEY,
  breakdownKeys,
  breakdownTotals,
  categoryKey,
  monthPeriodsEnding,
  monthlyStacks,
  parseKey,
  sumLines,
  type BreakdownBy,
  type BreakdownLookups,
  type BreakdownTotal,
  type InsightsScope,
  type StackMonth,
} from "@/lib/insights";
import { conversionContext } from "./summary";

/** Where tapping a slice goes; null when it has no screen (uncategorised, untagged, merchants, groups). */
export type BreakdownTarget =
  | { type: "category"; id: string }
  | { type: "tag"; id: string }
  | { type: "account"; id: string }
  | null;

/** How a bucket key is shown: name, icon, palette colour and screen. */
export interface SliceMeta {
  name: string;
  icon: string;
  /** Category palette key. */
  color: string;
  target: BreakdownTarget;
}

export interface BreakdownSlice extends SliceMeta {
  key: string;
  amount: number;
  percent: number;
  count: number;
  /** The categories inside a group, largest first; empty for every other slice. */
  children: BreakdownSlice[];
}

export interface Breakdown {
  currency: string;
  kind: "expense" | "income";
  by: BreakdownBy;
  total: number;
  /** Largest first. */
  slices: BreakdownSlice[];
}

type Describe = (
  row: Pick<BreakdownTotal, "key" | "categoryId" | "title">,
) => SliceMeta;

/** Lookups for `breakdownKeys` and a describer for the keys it produces. */
function breakdownContext(
  db: Db,
  kind: "expense" | "income",
  by: BreakdownBy,
  range: { from: string; to: string },
): {
  lookups: BreakdownLookups;
  describe: Describe;
  category: (id: string | null) => CategoryRow | null;
} {
  const categories = new Map(
    listCategories(db, kind, { includeArchived: true }).map((c) => [c.id, c]),
  );
  const links =
    by === "tag" ? tagLinks(db, range) : new Map<string, string[]>();
  const tags =
    by === "tag" ? new Map(listTags(db).map((t) => [t.id, t])) : new Map();
  const accounts =
    by === "account"
      ? new Map(
          listAccounts(db, { includeArchived: true }).map((a) => [a.id, a]),
        )
      : new Map();
  const category = (id: string | null): CategoryRow | null =>
    id ? (categories.get(id) ?? null) : null;
  const lookups: BreakdownLookups = {
    groupOf: (id) => category(id)?.groupName ?? null,
    tagsOf: (id) => links.get(id) ?? [],
  };
  const describe: Describe = (row) => {
    const { prefix, id } = parseKey(row.key);
    const lead = category(row.categoryId);
    switch (prefix) {
      case KEY.group:
        return {
          name: id,
          icon: "square.grid.2x2",
          color: lead?.color ?? "gray",
          target: null,
        };
      case KEY.tag: {
        const tag = tags.get(id);
        return {
          name: tag?.name ?? "Untagged",
          icon: "tag.fill",
          color: tag?.color ?? "gray",
          target: tag ? { type: "tag", id: tag.id } : null,
        };
      }
      case KEY.account: {
        const account = accounts.get(id);
        return {
          name: account?.name ?? "Deleted account",
          icon: account?.icon ?? "creditcard.fill",
          color: account?.color ?? "gray",
          target: account ? { type: "account", id: account.id } : null,
        };
      }
      case KEY.merchant:
        return {
          name: id === "" ? "No title" : row.title,
          icon: lead?.icon ?? "tag.fill",
          color: id === "" ? "gray" : (lead?.color ?? "gray"),
          target: null,
        };
      default: {
        const c = category(id || null);
        return {
          name: c?.name ?? "Uncategorised",
          icon: c?.icon ?? "tag.fill",
          color: c?.color ?? "gray",
          target: c ? { type: "category", id: c.id } : null,
        };
      }
    }
  };
  return { lookups, describe, category };
}

export function readBreakdown(
  db: Db,
  period: Period,
  kind: "expense" | "income",
  by: BreakdownBy,
  scope?: InsightsScope,
): Breakdown {
  const ctx = conversionContext(db);
  const range = { from: period.from, to: period.to };
  const lines = detailedLines(db, range, scope);
  const { lookups, describe, category } = breakdownContext(db, kind, by, range);
  const slice = (row: BreakdownTotal): BreakdownSlice => ({
    ...describe(row),
    key: row.key,
    amount: row.amount,
    percent: row.percent,
    count: row.count,
    children: [],
  });

  let slices = breakdownTotals(lines, kind, range, ctx, (l) =>
    breakdownKeys(by, l, lookups),
  ).map(slice);
  if (by === "group") {
    const byCategory = breakdownTotals(lines, kind, range, ctx, (l) => [
      categoryKey(l.categoryId),
    ]).map(slice);
    slices = slices.map((s) =>
      parseKey(s.key).prefix === KEY.group
        ? {
            ...s,
            children: byCategory.filter(
              (child) =>
                child.target !== null &&
                category(child.target.id)?.groupName === s.name,
            ),
          }
        : s,
    );
  }

  return {
    currency: ctx.displayCurrency,
    kind,
    by,
    total: sumLines(lines, kind, range, ctx),
    slices,
  };
}

export interface TrendSeries extends SliceMeta {
  key: string;
  /** Total over the whole range. */
  amount: number;
}

export interface MonthlyTrend {
  currency: string;
  kind: "expense" | "income";
  by: BreakdownBy;
  /** Bottom of the stack first; the last one is Other when the range had more buckets. */
  series: TrendSeries[];
  months: StackMonth[];
}

/** The `count` months ending at `endRef`, each split into the largest buckets of `by` plus Other. */
export function readMonthlyTrend(
  db: Db,
  endRef: DateKey,
  count: number,
  kind: "expense" | "income",
  by: BreakdownBy,
  settings: PeriodSettings,
  scope?: InsightsScope,
): MonthlyTrend {
  const ctx = conversionContext(db);
  const months = monthPeriodsEnding(endRef, count, settings);
  const range = { from: months[0]!.from, to: months[months.length - 1]!.to };
  const lines = detailedLines(db, range, scope);
  const { lookups, describe } = breakdownContext(db, kind, by, range);
  const keysOf = (l: (typeof lines)[number]) => breakdownKeys(by, l, lookups);
  const ranked = new Map(
    breakdownTotals(lines, kind, range, ctx, keysOf).map((r) => [r.key, r]),
  );
  const stacks = monthlyStacks(lines, kind, months, ctx, keysOf, 5);
  const series: TrendSeries[] = stacks.keys.map((key) => {
    const row = ranked.get(key);
    return {
      ...describe({
        key,
        categoryId: row?.categoryId ?? null,
        title: row?.title ?? "",
      }),
      key,
      amount: row?.amount ?? 0,
    };
  });
  if (stacks.hasOther)
    series.push({
      key: "other",
      name: "Other",
      icon: "ellipsis.circle.fill",
      color: "gray",
      target: null,
      amount: stacks.months.reduce(
        (sum, m) => sum + (m.values[m.values.length - 1] ?? 0),
        0,
      ),
    });
  return {
    currency: ctx.displayCurrency,
    kind,
    by,
    series,
    months: stacks.months,
  };
}
