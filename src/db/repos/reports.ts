import { and, between, eq, inArray } from 'drizzle-orm';
import type { FlatLine } from '@/lib/insights';
import { transactionSplits, transactions } from '../schema';
import type { Db } from '../types';

/**
 * Attributable amounts for a date range: plain income/expense rows by their
 * category plus one line per split, never split parents and never transfers.
 */
export function spendLines(db: Db, range: { from: string; to: string }): FlatLine[] {
  const kinds = ['expense', 'income'] as const;
  const plain = db
    .select({
      dateKey: transactions.dateKey,
      kind: transactions.kind,
      categoryId: transactions.categoryId,
      amount: transactions.amount,
      currency: transactions.currency,
    })
    .from(transactions)
    .where(and(between(transactions.dateKey, range.from, range.to), inArray(transactions.kind, [...kinds]), eq(transactions.isSplit, false)))
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
    .innerJoin(transactions, eq(transactionSplits.transactionId, transactions.id))
    .where(and(between(transactions.dateKey, range.from, range.to), inArray(transactions.kind, [...kinds])))
    .all();
  const lines: FlatLine[] = [];
  for (const row of [...plain, ...split]) {
    // Defensive: only plain spend kinds are attributable; transfers and lending never count.
    if (row.kind !== 'expense' && row.kind !== 'income') continue;
    lines.push({ dateKey: row.dateKey, kind: row.kind, categoryId: row.categoryId, amount: row.amount, currency: row.currency });
  }
  return lines;
}
