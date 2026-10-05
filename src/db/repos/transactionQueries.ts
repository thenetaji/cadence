import { and, between, desc, eq, inArray, or, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import { currencyCodesWithDigits, DISTINCT_DIGITS, parseAmountText } from '@/lib/money';
import {
  accounts,
  categories,
  transactionSplits,
  transactions,
  type TransactionKind,
  type TransactionRow,
} from '../schema';
import type { Db } from '../types';

export interface CategoryRef {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface AccountRef {
  id: string;
  name: string;
  icon: string;
  color: string;
  currency: string;
}

export interface SplitLine {
  id: string;
  categoryId: string;
  amount: number;
  sortOrder: number;
  category: CategoryRef;
}

export interface TransactionListItem extends TransactionRow {
  category: CategoryRef | null;
  account: AccountRef;
  transferAccount: AccountRef | null;
  splits: SplitLine[];
}

export interface PeriodFilter {
  /** Inclusive date keys. */
  from: string;
  to: string;
  kinds?: readonly TransactionKind[];
  categoryId?: string;
  accountId?: string;
}

const SEARCH_LIMIT = 200;
const IN_CHUNK = 500;

const transferAccounts = alias(accounts, 'transfer_accounts');

function baseSelect(db: Db) {
  return db
    .select({
      tx: transactions,
      categoryId: categories.id,
      categoryName: categories.name,
      categoryIcon: categories.icon,
      categoryColor: categories.color,
      accountName: accounts.name,
      accountIcon: accounts.icon,
      accountColor: accounts.color,
      accountCurrency: accounts.currency,
      toId: transferAccounts.id,
      toName: transferAccounts.name,
      toIcon: transferAccounts.icon,
      toColor: transferAccounts.color,
      toCurrency: transferAccounts.currency,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .leftJoin(transferAccounts, eq(transactions.transferAccountId, transferAccounts.id));
}

type BaseRow = ReturnType<typeof baseSelect> extends { all(): (infer R)[] } ? R : never;

function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function loadSplits(db: Db, ids: readonly string[]): Map<string, SplitLine[]> {
  const byTx = new Map<string, SplitLine[]>();
  for (const part of chunk(ids, IN_CHUNK)) {
    const rows = db
      .select({
        id: transactionSplits.id,
        transactionId: transactionSplits.transactionId,
        categoryId: transactionSplits.categoryId,
        amount: transactionSplits.amount,
        sortOrder: transactionSplits.sortOrder,
        name: categories.name,
        icon: categories.icon,
        color: categories.color,
      })
      .from(transactionSplits)
      .innerJoin(categories, eq(transactionSplits.categoryId, categories.id))
      .where(inArray(transactionSplits.transactionId, part))
      .orderBy(transactionSplits.sortOrder)
      .all();
    for (const r of rows) {
      const list = byTx.get(r.transactionId) ?? [];
      list.push({
        id: r.id,
        categoryId: r.categoryId,
        amount: r.amount,
        sortOrder: r.sortOrder,
        category: { id: r.categoryId, name: r.name, icon: r.icon, color: r.color },
      });
      byTx.set(r.transactionId, list);
    }
  }
  return byTx;
}

function hydrate(db: Db, rows: readonly BaseRow[]): TransactionListItem[] {
  const splits = loadSplits(
    db,
    rows.filter((r) => r.tx.isSplit).map((r) => r.tx.id),
  );
  return rows.map((r) => ({
    ...r.tx,
    category:
      r.categoryId && r.categoryName !== null && r.categoryIcon !== null && r.categoryColor !== null
        ? { id: r.categoryId, name: r.categoryName, icon: r.categoryIcon, color: r.categoryColor }
        : null,
    account: {
      id: r.tx.accountId,
      name: r.accountName,
      icon: r.accountIcon,
      color: r.accountColor,
      currency: r.accountCurrency,
    },
    transferAccount:
      r.toId && r.toName !== null && r.toIcon !== null && r.toColor !== null && r.toCurrency !== null
        ? { id: r.toId, name: r.toName, icon: r.toIcon, color: r.toColor, currency: r.toCurrency }
        : null,
    splits: splits.get(r.tx.id) ?? [],
  }));
}

const newestFirst = [desc(transactions.dateKey), desc(transactions.occurredAt)] as const;

export function getTransaction(db: Db, id: string): TransactionListItem | undefined {
  const rows = baseSelect(db).where(eq(transactions.id, id)).all();
  return hydrate(db, rows)[0];
}

export function listForPeriod(db: Db, filter: PeriodFilter): TransactionListItem[] {
  const conditions: (SQL | undefined)[] = [between(transactions.dateKey, filter.from, filter.to)];
  if (filter.kinds && filter.kinds.length > 0) conditions.push(inArray(transactions.kind, [...filter.kinds]));
  if (filter.accountId) {
    conditions.push(or(eq(transactions.accountId, filter.accountId), eq(transactions.transferAccountId, filter.accountId)));
  }
  if (filter.categoryId) {
    conditions.push(
      or(
        eq(transactions.categoryId, filter.categoryId),
        sql`exists (select 1 from ${transactionSplits} where ${transactionSplits.transactionId} = ${transactions.id} and ${transactionSplits.categoryId} = ${filter.categoryId})`,
      ),
    );
  }
  const rows = baseSelect(db)
    .where(and(...conditions))
    .orderBy(...newestFirst)
    .all();
  return hydrate(db, rows);
}

export function recent(db: Db, limit: number): TransactionListItem[] {
  const rows = baseSelect(db)
    .orderBy(...newestFirst)
    .limit(limit)
    .all();
  return hydrate(db, rows);
}

const escapeLike = (text: string) => text.replace(/[\\%_]/g, (c) => `\\${c}`);

/** Amounts use the digits of each currency: 0, 2 and 3 minor digits are matched separately. */
function amountClauses(text: string): SQL[] {
  const clauses: SQL[] = [];
  for (const digits of DISTINCT_DIGITS) {
    const probe = digits === 0 ? 'JPY' : digits === 3 ? 'KWD' : 'USD';
    const minor = parseAmountText(text, probe);
    if (minor === null || minor <= 0) continue;
    const low = Math.floor(minor * 0.995);
    const high = Math.ceil(minor * 1.005);
    const codes = currencyCodesWithDigits(digits);
    const currencyClause =
      digits === 2
        ? sql`${transactions.currency} not in (${sql.join(
            DISTINCT_DIGITS.filter((d) => d !== 2).flatMap(currencyCodesWithDigits).map((c) => sql`${c}`),
            sql`, `,
          )})`
        : inArray(transactions.currency, codes);
    const clause = and(currencyClause, between(transactions.amount, low, high));
    if (clause) clauses.push(clause);
  }
  return clauses;
}

export function search(db: Db, text: string): TransactionListItem[] {
  const query = text.trim();
  if (query === '') return [];
  const like = `%${escapeLike(query)}%`;
  const matches = or(
    sql`${transactions.title} like ${like} escape '\\'`,
    sql`${transactions.memo} like ${like} escape '\\'`,
    ...amountClauses(query),
  );
  const rows = baseSelect(db)
    .where(matches)
    .orderBy(...newestFirst)
    .limit(SEARCH_LIMIT)
    .all();
  return hydrate(db, rows);
}
