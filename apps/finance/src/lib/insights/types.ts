import type { DateKey } from "@studio/dates";

/** One attributable amount: a plain transaction, or one split line. Transfers never appear. */
export interface FlatLine {
  dateKey: DateKey;
  kind: "expense" | "income";
  categoryId: string | null;
  amount: number;
  currency: string;
}

/** Narrows Insights to one account and/or one tag; null or absent means everything. */
export interface InsightsScope {
  accountId?: string | null;
  tagId?: string | null;
}

/** Stable cache key for a scope. */
export const scopeKey = (scope: InsightsScope | undefined): string =>
  `${scope?.accountId ?? ""}|${scope?.tagId ?? ""}`;
