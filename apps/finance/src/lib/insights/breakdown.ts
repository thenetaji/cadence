import type { Period } from "@studio/dates";
import { convertLine, type ConversionContext } from "./aggregate";
import { normaliseTitle, type DetailedLine } from "./extras";

/** What Insights can split a period's total by. */
export type BreakdownBy = "category" | "group" | "tag" | "account" | "merchant";

export const BREAKDOWN_BYS: readonly BreakdownBy[] = [
  "category",
  "group",
  "tag",
  "account",
  "merchant",
];

/** Key prefixes; a key is `<prefix>:<id>` and `<prefix>:` alone means "none" (uncategorised, untagged, untitled). */
export const KEY = {
  category: "c",
  group: "g",
  tag: "t",
  account: "a",
  merchant: "m",
} as const;

export interface BreakdownLookups {
  /** Group name of a category, or null when it stands alone. */
  groupOf: (categoryId: string | null) => string | null;
  /** Tag ids on the line's transaction (split lines share their parent's tags). */
  tagsOf: (transactionId: string) => readonly string[];
}

export const categoryKey = (categoryId: string | null): string =>
  `${KEY.category}:${categoryId ?? ""}`;

/**
 * The bucket keys a line counts towards. A line counts once, except under `tag`, where a transaction with
 * two tags counts in both. Categories without a group stand alone in the `group` breakdown, so nothing
 * hides in an anonymous bucket.
 */
export function breakdownKeys(
  by: BreakdownBy,
  line: DetailedLine,
  lookups: BreakdownLookups,
): readonly string[] {
  switch (by) {
    case "category":
      return [categoryKey(line.categoryId)];
    case "group": {
      const group = lookups.groupOf(line.categoryId);
      return [group ? `${KEY.group}:${group}` : categoryKey(line.categoryId)];
    }
    case "tag": {
      const tags = lookups.tagsOf(line.transactionId);
      return tags.length === 0
        ? [`${KEY.tag}:`]
        : [...new Set(tags)].map((id) => `${KEY.tag}:${id}`);
    }
    case "account":
      return [`${KEY.account}:${line.accountId}`];
    case "merchant":
      return [`${KEY.merchant}:${normaliseTitle(line.title)}`];
  }
}

/** Splits a key back into its prefix and id ("" for the none bucket). */
export function parseKey(key: string): { prefix: string; id: string } {
  const at = key.indexOf(":");
  return at < 0
    ? { prefix: key, id: "" }
    : { prefix: key.slice(0, at), id: key.slice(at + 1) };
}

export interface BreakdownTotal {
  key: string;
  amount: number;
  /** Share of the kind's total in the period, 0-100. Under `tag` the shares can add up past 100. */
  percent: number;
  /** Distinct transactions. */
  count: number;
  /** The largest category inside the bucket, for colour and icon fallbacks. */
  categoryId: string | null;
  /** First title seen, as written, for merchant buckets. */
  title: string;
}

/** Totals per bucket for `kind` in `period`, largest first (ties: more transactions, then key). */
export function breakdownTotals(
  lines: readonly DetailedLine[],
  kind: DetailedLine["kind"],
  period: Pick<Period, "from" | "to">,
  ctx: ConversionContext,
  keysOf: (line: DetailedLine) => readonly string[],
): BreakdownTotal[] {
  type Acc = {
    amount: number;
    ids: Set<string>;
    categories: Map<string | null, number>;
    title: string;
  };
  const buckets = new Map<string, Acc>();
  let total = 0;
  for (const line of lines) {
    if (
      line.kind !== kind ||
      line.dateKey < period.from ||
      line.dateKey > period.to
    )
      continue;
    const amount = convertLine(line, ctx);
    total += amount;
    for (const key of keysOf(line)) {
      const acc = buckets.get(key) ?? {
        amount: 0,
        ids: new Set<string>(),
        categories: new Map(),
        title: line.title.trim().replace(/\s+/g, " "),
      };
      acc.amount += amount;
      acc.ids.add(line.transactionId);
      acc.categories.set(
        line.categoryId,
        (acc.categories.get(line.categoryId) ?? 0) + amount,
      );
      buckets.set(key, acc);
    }
  }
  return [...buckets.entries()]
    .map(([key, acc]) => {
      let categoryId: string | null = null;
      let max = -1;
      for (const [id, amount] of acc.categories) {
        if (amount > max) {
          max = amount;
          categoryId = id;
        }
      }
      return {
        key,
        amount: acc.amount,
        percent: total <= 0 ? 0 : Math.round((acc.amount * 100) / total),
        count: acc.ids.size,
        categoryId,
        title: acc.title,
      };
    })
    .sort(
      (a, b) =>
        b.amount - a.amount || b.count - a.count || a.key.localeCompare(b.key),
    );
}
