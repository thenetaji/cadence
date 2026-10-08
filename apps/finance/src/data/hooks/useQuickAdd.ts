import { and, inArray, ne } from "drizzle-orm";

import { transactions } from "@/db/schema";
import type { Db } from "@/db/types";
import { useLiveData } from "@/data/use-live-data";

export interface QuickAddCandidate {
  title: string;
  categoryId: string | null;
  accountId: string;
  kind: string;
  occurredAt: number;
}

export interface QuickAddEntry {
  title: string;
  categoryId: string | null;
  /** Account of the most recent use. */
  accountId: string;
  kind: "expense" | "income";
  count: number;
  lastAt: number;
}

/**
 * Pure ranking: group by (title, category), most used first, ties by most recent use, then title.
 * Blank titles, transfers and lending kinds are skipped. Kind and account come from the latest use.
 */
export function rankQuickAdd(
  rows: readonly QuickAddCandidate[],
  limit: number,
): QuickAddEntry[] {
  const groups = new Map<string, QuickAddEntry>();
  for (const row of rows) {
    if (row.kind !== "expense" && row.kind !== "income") continue;
    const title = row.title.trim();
    if (!title) continue;
    const key = `${title.toLowerCase()}\u0000${row.categoryId ?? ""}`;
    const found = groups.get(key);
    if (!found) {
      groups.set(key, {
        title,
        categoryId: row.categoryId,
        accountId: row.accountId,
        kind: row.kind,
        count: 1,
        lastAt: row.occurredAt,
      });
      continue;
    }
    found.count += 1;
    if (row.occurredAt >= found.lastAt) {
      found.lastAt = row.occurredAt;
      found.accountId = row.accountId;
      found.kind = row.kind;
      found.title = title;
    }
  }
  return [...groups.values()]
    .sort(
      (a, b) =>
        b.count - a.count ||
        b.lastAt - a.lastAt ||
        a.title.localeCompare(b.title),
    )
    .slice(0, Math.max(limit, 0));
}

export function quickAdd(db: Db, limit: number): QuickAddEntry[] {
  const rows = db
    .select({
      title: transactions.title,
      categoryId: transactions.categoryId,
      accountId: transactions.accountId,
      kind: transactions.kind,
      occurredAt: transactions.occurredAt,
    })
    .from(transactions)
    .where(
      and(
        inArray(transactions.kind, ["expense", "income"]),
        ne(transactions.title, ""),
      ),
    )
    .all();
  return rankQuickAdd(rows, limit);
}

/** Home quick-add chips: the most frequent title + category pairs across all transactions. */
export function useQuickAdd(limit: number): QuickAddEntry[] {
  return useLiveData(["transactions"], `quickadd:${limit}`, (db) =>
    quickAdd(db, limit),
  );
}
