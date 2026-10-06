import { and, asc, eq, gte, inArray, lte } from 'drizzle-orm';
import { toDateKey, type DateKey } from '@studio/dates';
import {
  IMPORT_CATEGORY_ICON,
  IMPORT_PALETTE,
  categoryKey,
  dedupeKey,
  existingAccountKeys,
  planImport,
  type ExistingData,
  type ExportRecord,
  type ImportRow,
  type ImportStats,
  type PlanDefaults,
} from '@/lib/csv';
import { ValidationError } from '../errors';
import { newId } from '@studio/data';
import {
  accounts,
  categories,
  people,
  tags,
  transactionSplits,
  transactionTags,
  transactions,
  type NewSplit,
  type NewTransaction,
  type TransactionRow,
} from '../schema';
import type { Db } from '../types';
import { createAccount } from './accounts';
import { createCategory } from './categories';
import { findOrCreatePerson } from './people';
import { findOrCreateTag } from './tags';

/** Everything the planner needs to match a file against what is already stored. */
export function loadImportContext(db: Db): ExistingData {
  const keys = new Map<string, number>();
  for (const t of db
    .select({ dateKey: transactions.dateKey, amount: transactions.amount, title: transactions.title })
    .from(transactions)
    .all()) {
    const key = dedupeKey(t.dateKey, t.amount, t.title);
    keys.set(key, (keys.get(key) ?? 0) + 1);
  }
  return {
    accounts: db.select({ id: accounts.id, name: accounts.name, currency: accounts.currency }).from(accounts).all(),
    categories: db.select({ id: categories.id, name: categories.name, kind: categories.kind }).from(categories).all(),
    ids: new Set(db.select({ id: transactions.id }).from(transactions).all().map((t) => t.id)),
    tags: db.select({ id: tags.id, name: tags.name }).from(tags).all(),
    people: db.select({ id: people.id, name: people.name }).from(people).all(),
    keys,
  };
}

export interface ImportResult extends ImportStats {
  imported: number;
}

/** Writes parsed rows in a single transaction: matches or creates accounts and categories, skips duplicates. */
export function importTransactions(db: Db, rows: readonly ImportRow[], defaults: PlanDefaults, now = Date.now()): ImportResult {
  return db.transaction((tx) => {
    const plan = planImport(rows, loadImportContext(tx), defaults);

    const accountIds = new Map<string, string>();
    const stored = tx.select({ id: accounts.id, name: accounts.name, currency: accounts.currency }).from(accounts).all();
    const keyById = existingAccountKeys(stored);
    for (const a of stored) accountIds.set(keyById.get(a.id) as string, a.id);
    const accountCount = accountIds.size;
    plan.newAccounts.forEach((a, i) => {
      const created = createAccount(
        tx,
        { name: a.name, type: 'bank', currency: a.currency, color: IMPORT_PALETTE[(accountCount + i) % IMPORT_PALETTE.length] as string },
        now,
      );
      accountIds.set(a.key, created.id);
    });

    const categoryIds = new Map<string, string>();
    for (const c of tx.select({ id: categories.id, name: categories.name, kind: categories.kind }).from(categories).all()) {
      categoryIds.set(categoryKey(c.kind, c.name), c.id);
    }
    const colorOffset = { expense: categoryIds.size, income: categoryIds.size };
    plan.newCategories.forEach((c, i) => {
      const created = createCategory(
        tx,
        { name: c.name, kind: c.kind, icon: IMPORT_CATEGORY_ICON, color: IMPORT_PALETTE[(colorOffset[c.kind] + i) % IMPORT_PALETTE.length] as string },
        now,
      );
      categoryIds.set(c.key, created.id);
    });

    const need = (map: Map<string, string>, key: string | null): string => {
      const id = key === null ? undefined : map.get(key);
      if (!id) throw new ValidationError('invalid_input', 'unresolved reference');
      return id;
    };

    const tagIds = new Map<string, string>();
    const tagKey = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase();
    const personIds = new Map<string, string>();
    const tagColour = (i: number) => IMPORT_PALETTE[i % IMPORT_PALETTE.length] as string;
    const existingTags = tx.select({ id: tags.id, name: tags.name }).from(tags).all();
    existingTags.forEach((t) => tagIds.set(tagKey(t.name), t.id));
    plan.newTags.forEach((name, i) => tagIds.set(tagKey(name), findOrCreateTag(tx, name, tagColour(existingTags.length + i), now).id));
    for (const p of tx.select({ id: people.id, name: people.name }).from(people).all()) personIds.set(tagKey(p.name), p.id);
    for (const name of plan.newPeople) personIds.set(tagKey(name), findOrCreatePerson(tx, name, now).id);

    const accountCurrency = new Map(tx.select({ id: accounts.id, currency: accounts.currency }).from(accounts).all().map((a) => [a.id, a.currency]));
    plan.transactions.forEach((t, index) => {
      const id = t.id ?? newId();
      const stamp = now + index;
      const transferId = t.transferAccountKey ? need(accountIds, t.transferAccountKey) : null;
      const row: NewTransaction = {
        id,
        kind: t.kind,
        title: t.title,
        memo: t.memo,
        amount: t.amount,
        currency: accountCurrency.get(need(accountIds, t.accountKey)) ?? t.currency,
        accountId: need(accountIds, t.accountKey),
        categoryId: t.categoryKey ? need(categoryIds, t.categoryKey) : null,
        transferAccountId: transferId,
        transferAmount: t.transferAmount,
        transferCurrency: transferId ? (accountCurrency.get(transferId) ?? null) : null,
        occurredAt: t.occurredAt,
        dateKey: toDateKey(t.occurredAt),
        isSplit: t.splits.length > 0,
        recurringRuleId: null,
        personId: t.personName ? (personIds.get(tagKey(t.personName)) ?? null) : null,
        createdAt: stamp,
        updatedAt: stamp,
      };
      tx.insert(transactions).values(row).run();
      if (t.tags.length > 0) {
        tx.insert(transactionTags).values(t.tags.map((name) => ({ transactionId: id, tagId: need(tagIds, tagKey(name)) }))).run();
      }
      if (t.splits.length > 0) {
        const lines: NewSplit[] = t.splits.map((s, sortOrder) => ({
          id: newId(),
          transactionId: id,
          categoryId: need(categoryIds, s.categoryKey),
          amount: s.amount,
          sortOrder,
        }));
        tx.insert(transactionSplits).values(lines).run();
      }
    });

    return { ...plan.stats, imported: plan.transactions.length };
  });
}

export interface ExportFilter {
  from?: DateKey;
  to?: DateKey;
  /** Source accounts to include; every account when omitted. */
  accountIds?: readonly string[];
}

/** Transactions with names resolved, oldest first, ready for the CSV serialiser. */
export function listForExport(db: Db, filter: ExportFilter = {}): ExportRecord[] {
  const conditions = [
    filter.from ? gte(transactions.dateKey, filter.from) : undefined,
    filter.to ? lte(transactions.dateKey, filter.to) : undefined,
    filter.accountIds ? inArray(transactions.accountId, [...filter.accountIds]) : undefined,
  ];
  const rows: TransactionRow[] = db
    .select()
    .from(transactions)
    .where(and(...conditions))
    .orderBy(asc(transactions.occurredAt), asc(transactions.id))
    .all();
  if (rows.length === 0) return [];

  const accountNames = new Map(db.select({ id: accounts.id, name: accounts.name }).from(accounts).all().map((a) => [a.id, a.name]));
  const categoryNames = new Map(db.select({ id: categories.id, name: categories.name }).from(categories).all().map((c) => [c.id, c.name]));
  const tagNames = new Map<string, string[]>();
  for (const row of db
    .select({ transactionId: transactionTags.transactionId, name: tags.name })
    .from(transactionTags)
    .innerJoin(tags, eq(tags.id, transactionTags.tagId))
    .orderBy(asc(tags.name))
    .all()) {
    tagNames.set(row.transactionId, [...(tagNames.get(row.transactionId) ?? []), row.name]);
  }
  const personNames = new Map(db.select({ id: people.id, name: people.name }).from(people).all().map((p) => [p.id, p.name]));
  const wanted = new Set(rows.filter((r) => r.isSplit).map((r) => r.id));
  const splits = new Map<string, { category: string; amount: number }[]>();
  if (wanted.size > 0) {
    for (const s of db.select().from(transactionSplits).orderBy(asc(transactionSplits.transactionId), asc(transactionSplits.sortOrder)).all()) {
      if (!wanted.has(s.transactionId)) continue;
      const list = splits.get(s.transactionId) ?? [];
      list.push({ category: categoryNames.get(s.categoryId) ?? '', amount: s.amount });
      splits.set(s.transactionId, list);
    }
  }

  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    title: r.title,
    memo: r.memo,
    amount: r.amount,
    currency: r.currency,
    occurredAt: r.occurredAt,
    category: r.categoryId ? (categoryNames.get(r.categoryId) ?? null) : null,
    account: accountNames.get(r.accountId) ?? '',
    transferAccount: r.transferAccountId ? (accountNames.get(r.transferAccountId) ?? null) : null,
    transferAmount: r.transferAmount,
    transferCurrency: r.transferCurrency,
    splits: splits.get(r.id) ?? [],
    tags: tagNames.get(r.id) ?? [],
    person: r.personId ? (personNames.get(r.personId) ?? null) : null,
  }));
}
