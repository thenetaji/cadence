import { listAccounts } from "@/db/repos/accounts";
import { listCategories } from "@/db/repos/categories";
import { detailedLines } from "@/db/repos/insight-lines";
import { tagLinks } from "@/db/repos/reports";
import { listTags } from "@/db/repos/tags";
import type { CategoryRow } from "@/db/schema";
import type { Db } from "@/db/types";
import type { Period } from "@studio/dates";
import {
  KEY,
  breakdownKeys,
  breakdownTotals,
  categoryKey,
  parseKey,
  sumLines,
  type BreakdownBy,
  type BreakdownLookups,
  type BreakdownTotal,
  type InsightsScope,
} from "@/lib/insights";
import { conversionContext } from "./summary";

/** Where tapping a slice goes; null when it has no screen (uncategorised, untagged, merchants, groups). */
export type BreakdownTarget =
  | { type: "category"; id: string }
  | { type: "tag"; id: string }
  | { type: "account"; id: string }
  | null;

export interface BreakdownSlice {
  key: string;
  name: string;
  icon: string;
  /** Category palette key. */
  color: string;
  amount: number;
  percent: number;
  count: number;
  target: BreakdownTarget;
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
  const categories = new Map(
    listCategories(db, kind, { includeArchived: true }).map((c) => [c.id, c]),
  );
  const tags = by === "tag" ? tagLinks(db, range) : new Map<string, string[]>();
  const lookups: BreakdownLookups = {
    groupOf: (id) => (id ? (categories.get(id)?.groupName ?? null) : null),
    tagsOf: (id) => tags.get(id) ?? [],
  };
  const category = (id: string | null): CategoryRow | null =>
    id ? (categories.get(id) ?? null) : null;

  const categorySlice = (row: BreakdownTotal): BreakdownSlice => {
    const c = category(parseKey(row.key).id || null);
    return {
      key: row.key,
      name: c?.name ?? "Uncategorised",
      icon: c?.icon ?? "tag.fill",
      color: c?.color ?? "gray",
      amount: row.amount,
      percent: row.percent,
      count: row.count,
      target: c ? { type: "category", id: c.id } : null,
      children: [],
    };
  };

  let slices: BreakdownSlice[];
  if (by === "category") {
    slices = breakdownTotals(lines, kind, range, ctx, (l) =>
      breakdownKeys("category", l, lookups),
    ).map(categorySlice);
  } else if (by === "group") {
    const byCategory = breakdownTotals(lines, kind, range, ctx, (l) => [
      categoryKey(l.categoryId),
    ]).map(categorySlice);
    slices = breakdownTotals(lines, kind, range, ctx, (l) =>
      breakdownKeys("group", l, lookups),
    ).map((row) => {
      const { prefix, id } = parseKey(row.key);
      if (prefix !== KEY.group) return categorySlice(row);
      const lead = category(row.categoryId);
      return {
        key: row.key,
        name: id,
        icon: "square.grid.2x2",
        color: lead?.color ?? "gray",
        amount: row.amount,
        percent: row.percent,
        count: row.count,
        target: null,
        children: byCategory.filter(
          (child) =>
            child.target !== null &&
            category(child.target.id)?.groupName === id,
        ),
      };
    });
  } else if (by === "tag") {
    const byId = new Map(listTags(db).map((t) => [t.id, t]));
    slices = breakdownTotals(lines, kind, range, ctx, (l) =>
      breakdownKeys("tag", l, lookups),
    ).map((row) => {
      const tag = byId.get(parseKey(row.key).id);
      return {
        key: row.key,
        name: tag?.name ?? "Untagged",
        icon: "tag.fill",
        color: tag?.color ?? "gray",
        amount: row.amount,
        percent: row.percent,
        count: row.count,
        target: tag ? { type: "tag", id: tag.id } : null,
        children: [],
      };
    });
  } else if (by === "account") {
    const byId = new Map(
      listAccounts(db, { includeArchived: true }).map((a) => [a.id, a]),
    );
    slices = breakdownTotals(lines, kind, range, ctx, (l) =>
      breakdownKeys("account", l, lookups),
    ).map((row) => {
      const account = byId.get(parseKey(row.key).id);
      return {
        key: row.key,
        name: account?.name ?? "Deleted account",
        icon: account?.icon ?? "creditcard.fill",
        color: account?.color ?? "gray",
        amount: row.amount,
        percent: row.percent,
        count: row.count,
        target: account ? { type: "account", id: account.id } : null,
        children: [],
      };
    });
  } else {
    slices = breakdownTotals(lines, kind, range, ctx, (l) =>
      breakdownKeys("merchant", l, lookups),
    ).map((row) => {
      const lead = category(row.categoryId);
      const untitled = parseKey(row.key).id === "";
      return {
        key: row.key,
        name: untitled ? "No title" : row.title,
        icon: lead?.icon ?? "tag.fill",
        color: untitled ? "gray" : (lead?.color ?? "gray"),
        amount: row.amount,
        percent: row.percent,
        count: row.count,
        target: null,
        children: [],
      };
    });
  }

  return {
    currency: ctx.displayCurrency,
    kind,
    by,
    total: sumLines(lines, kind, range, ctx),
    slices,
  };
}
