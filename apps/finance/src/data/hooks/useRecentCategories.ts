import { and, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import { categories, transactionSplits, transactions, type CategoryKind, type CategoryRow } from '@/db/schema';
import type { Db } from '@/db/types';
import { useLiveData } from '@/data/use-live-data';

/** Most recently used categories of a kind (split lines count); topped up with the first categories when history is short. */
export function recentCategories(db: Db, kind: CategoryKind, limit: number): CategoryRow[] {
  const used = db
    .select({ id: categories.id, last: sql<number>`max(${transactions.occurredAt})` })
    .from(transactions)
    .innerJoin(categories, eq(categories.id, transactions.categoryId))
    .where(and(eq(transactions.kind, kind), isNotNull(transactions.categoryId), isNull(categories.archivedAt)))
    .groupBy(categories.id)
    .all();
  const viaSplits = db
    .select({ id: categories.id, last: sql<number>`max(${transactions.occurredAt})` })
    .from(transactionSplits)
    .innerJoin(transactions, eq(transactions.id, transactionSplits.transactionId))
    .innerJoin(categories, eq(categories.id, transactionSplits.categoryId))
    .where(and(eq(transactions.kind, kind), isNull(categories.archivedAt)))
    .groupBy(categories.id)
    .all();
  const lastUsed = new Map<string, number>();
  for (const row of [...used, ...viaSplits]) lastUsed.set(row.id, Math.max(lastUsed.get(row.id) ?? 0, row.last));
  const all = db
    .select()
    .from(categories)
    .where(and(eq(categories.kind, kind), isNull(categories.archivedAt)))
    .orderBy(categories.sortOrder, categories.createdAt)
    .all();
  const byRecency = all.filter((c) => lastUsed.has(c.id)).sort((a, b) => (lastUsed.get(b.id) ?? 0) - (lastUsed.get(a.id) ?? 0));
  const rest = all.filter((c) => !lastUsed.has(c.id));
  return [...byRecency, ...rest].slice(0, limit);
}

export function useRecentCategories(kind: CategoryKind, limit = 7): CategoryRow[] {
  return useLiveData(['categories', 'transactions', 'transaction_splits'], `${kind}:${limit}`, (db) => recentCategories(db, kind, limit));
}

