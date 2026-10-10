import { and, between, eq, inArray, sql, type SQL } from "drizzle-orm";
import type { FlatLine, InsightsScope } from "@/lib/insights";
import { transactionSplits, transactionTags, transactions } from "../schema";
import type { Db } from "../types";

/**
 * Attributable amounts for a date range: plain income/expense rows by their
 * category plus one line per split, never split parents and never transfers.
 */
export function spendLines(
  db: Db,
  range: { from: string; to: string },
  scope?: InsightsScope,
): FlatLine[] {
  const kinds = ["expense", "income"] as const;
  const plain = db
    .select({
      dateKey: transactions.dateKey,
      kind: transactions.kind,
      categoryId: transactions.categoryId,
      amount: transactions.amount,
      currency: transactions.currency,
    })
    .from(transactions)
    .where(
      and(
        between(transactions.dateKey, range.from, range.to),
        inArray(transactions.kind, [...kinds]),
        eq(transactions.isSplit, false),
        ...scopeConditions(scope),
      ),
    )
    .all();
  const split = db
    .select({
      dateKey: transactions.dateKey,
      kind: transactions.kind,
      categoryId: transactionSplits.categoryId,
      amount: transactionSplits.amount,
      currency: transactions.currency,
    })
    .from(transactionSplits)
    .innerJoin(
      transactions,
      eq(transactionSplits.transactionId, transactions.id),
    )
    .where(
      and(
        between(transactions.dateKey, range.from, range.to),
        inArray(transactions.kind, [...kinds]),
        ...scopeConditions(scope),
      ),
    )
    .all();
  const lines: FlatLine[] = [];
  for (const row of [...plain, ...split]) {
    // Defensive: only plain spend kinds are attributable; transfers and lending never count.
    if (row.kind !== "expense" && row.kind !== "income") continue;
    lines.push({
      dateKey: row.dateKey,
      kind: row.kind,
      categoryId: row.categoryId,
      amount: row.amount,
      currency: row.currency,
    });
  }
  return lines;
}

/** Extra WHERE terms on `transactions` for an Insights scope (account, tag). */
export function scopeConditions(scope: InsightsScope | undefined): SQL[] {
  const out: SQL[] = [];
  if (scope?.accountId) out.push(eq(transactions.accountId, scope.accountId));
  if (scope?.tagId)
    out.push(
      sql`exists (select 1 from ${transactionTags} where ${transactionTags.transactionId} = ${transactions.id} and ${transactionTags.tagId} = ${scope.tagId})`,
    );
  return out;
}

/** Tag ids per transaction for transactions dated in `range`. */
export function tagLinks(
  db: Db,
  range: { from: string; to: string },
): Map<string, string[]> {
  const rows = db
    .select({
      transactionId: transactionTags.transactionId,
      tagId: transactionTags.tagId,
    })
    .from(transactionTags)
    .innerJoin(transactions, eq(transactionTags.transactionId, transactions.id))
    .where(between(transactions.dateKey, range.from, range.to))
    .all();
  const out = new Map<string, string[]>();
  for (const row of rows) {
    const list = out.get(row.transactionId);
    if (list) list.push(row.tagId);
    else out.set(row.transactionId, [row.tagId]);
  }
  return out;
}
