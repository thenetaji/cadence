import { eq, inArray } from 'drizzle-orm';
import { toDateKey } from '@studio/dates';
import { isLendingKind } from '@/lib/ledger';
import { ValidationError } from '../errors';
import { newId } from '../ids';
import {
  accounts,
  attachments,
  categories,
  people,
  tags,
  transactionSplits,
  transactionTags,
  transactions,
  type AccountRow,
  type AttachmentRow,
  type CategoryRow,
  type PersonRow,
  type SplitRow,
  type TransactionKind,
  type TransactionRow,
} from '../schema';
import type { Db } from '../types';
import { replaceTransactionTags } from './tags';
import { recordTitle } from './titleMemory';

export { getTransaction, listForPeriod, recent, search, transactionsForTag } from './transactionQueries';
export type { PeriodFilter, TransactionListItem } from './transactionQueries';

export const MIN_SPLITS = 2;
export const MAX_SPLITS = 8;

export interface SplitInput {
  categoryId: string;
  amount: number;
}

export interface TransactionInput {
  kind: TransactionKind;
  title?: string;
  memo?: string;
  /** Positive minor units in the source account's currency. */
  amount: number;
  accountId: string;
  categoryId?: string | null;
  splits?: readonly SplitInput[];
  transferAccountId?: string | null;
  /** Minor units in the destination account's currency; required for cross-currency transfers. */
  transferAmount?: number | null;
  occurredAt: number;
  recurringRuleId?: string | null;
  /** Required for lent, borrowed, repaid_to_me and repaid_by_me; ignored for other kinds. */
  personId?: string | null;
  /** Replaces the transaction's tags. On update, omit to keep the current tags. */
  tagIds?: readonly string[];
}

export interface TransactionSnapshot {
  transaction: TransactionRow;
  splits: SplitRow[];
  /** Tag links and attachment metadata, restored by {@link restoreTransaction}. */
  tagIds?: string[];
  attachments?: AttachmentRow[];
}

interface Resolved {
  account: AccountRow;
  transferAccount: AccountRow | null;
  person: PersonRow | null;
  categoryIds: string[];
  categories: Map<string, CategoryRow>;
}

function assertPositiveInteger(value: number, code: 'amount_not_positive' | 'split_amount_not_positive'): void {
  if (!Number.isInteger(value)) throw new ValidationError('amount_not_integer');
  if (value <= 0) throw new ValidationError(code);
}

function resolve(db: Db, input: TransactionInput): Resolved {
  assertPositiveInteger(input.amount, 'amount_not_positive');
  const account = db.select().from(accounts).where(eq(accounts.id, input.accountId)).get();
  if (!account) throw new ValidationError('account_not_found');

  let transferAccount: AccountRow | null = null;
  let person: PersonRow | null = null;
  const categoryIds: string[] = [];

  if (isLendingKind(input.kind)) {
    if (!input.personId) throw new ValidationError('person_required');
    person = db.select().from(people).where(eq(people.id, input.personId)).get() ?? null;
    if (!person) throw new ValidationError('person_not_found');
    if (input.splits && input.splits.length > 0) throw new ValidationError('invalid_input', 'lending cannot be split');
  } else if (input.kind === 'transfer') {
    if (!input.transferAccountId || input.transferAccountId === input.accountId) {
      throw new ValidationError('transfer_needs_two_accounts');
    }
    if (input.splits && input.splits.length > 0) throw new ValidationError('invalid_input', 'transfers cannot be split');
    transferAccount = db.select().from(accounts).where(eq(accounts.id, input.transferAccountId)).get() ?? null;
    if (!transferAccount) throw new ValidationError('account_not_found');
    if (transferAccount.currency !== account.currency) {
      if (input.transferAmount == null) throw new ValidationError('transfer_amount_required');
      assertPositiveInteger(input.transferAmount, 'amount_not_positive');
    }
  } else if (input.splits && input.splits.length > 0) {
    if (input.splits.length < MIN_SPLITS || input.splits.length > MAX_SPLITS) throw new ValidationError('split_count');
    let sum = 0;
    for (const line of input.splits) {
      assertPositiveInteger(line.amount, 'split_amount_not_positive');
      sum += line.amount;
      categoryIds.push(line.categoryId);
    }
    if (sum !== input.amount) throw new ValidationError('split_sum_mismatch');
  } else {
    if (!input.categoryId) throw new ValidationError('category_required');
    categoryIds.push(input.categoryId);
  }

  const found = new Map<string, CategoryRow>();
  const unique = [...new Set(categoryIds)];
  if (unique.length > 0) {
    for (const row of db.select().from(categories).where(inArray(categories.id, unique)).all()) found.set(row.id, row);
    for (const id of unique) {
      const row = found.get(id);
      if (!row) throw new ValidationError('category_not_found');
      if (row.kind !== input.kind) throw new ValidationError('target_kind_mismatch', 'category kind must match the transaction kind');
    }
  }
  return { account, transferAccount, person, categoryIds, categories: found };
}

function writeRows(db: Db, id: string, input: TransactionInput, resolved: Resolved, existing: TransactionRow | undefined, now: number): void {
  const { account, transferAccount, person } = resolved;
  const hasCategory = input.kind === 'expense' || input.kind === 'income';
  const isSplit = hasCategory && (input.splits?.length ?? 0) > 0;
  const firstCategory = resolved.categoryIds[0];
  const typedTitle = (input.title ?? '').trim();
  const fallbackTitle = person ? person.name : !hasCategory || !firstCategory ? '' : (resolved.categories.get(firstCategory)?.name ?? '');
  const sameCurrency = transferAccount?.currency === account.currency;

  const row: TransactionRow = {
    id,
    kind: input.kind,
    title: typedTitle || fallbackTitle,
    memo: (input.memo ?? '').trim(),
    amount: input.amount,
    currency: account.currency,
    accountId: account.id,
    categoryId: !hasCategory || isSplit ? null : (input.categoryId ?? null),
    transferAccountId: transferAccount?.id ?? null,
    transferAmount: transferAccount ? (sameCurrency ? input.amount : (input.transferAmount ?? null)) : null,
    transferCurrency: transferAccount?.currency ?? null,
    occurredAt: input.occurredAt,
    dateKey: toDateKey(input.occurredAt),
    isSplit,
    recurringRuleId: input.recurringRuleId ?? null,
    personId: person?.id ?? null,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  if (existing) db.update(transactions).set(row).where(eq(transactions.id, id)).run();
  else db.insert(transactions).values(row).run();
  db.delete(transactionSplits).where(eq(transactionSplits.transactionId, id)).run();
  if (isSplit && input.splits) {
    db.insert(transactionSplits)
      .values(input.splits.map((line, index) => ({ id: newId(), transactionId: id, categoryId: line.categoryId, amount: line.amount, sortOrder: index })))
      .run();
  }

  if (input.tagIds !== undefined || !existing) replaceTransactionTags(db, id, input.tagIds ?? []);

  if (typedTitle && hasCategory) {
    recordTitle(db, {
      title: typedTitle,
      kind: input.kind as 'expense' | 'income',
      categoryId: firstCategory ?? null,
      accountId: account.id,
      amount: input.amount,
      currency: account.currency,
      now,
    });
  }
}

export function createTransaction(db: Db, input: TransactionInput, now = Date.now()): TransactionRow {
  return db.transaction((tx) => {
    const resolved = resolve(tx, input);
    const id = newId();
    writeRows(tx, id, input, resolved, undefined, now);
    const created = tx.select().from(transactions).where(eq(transactions.id, id)).get();
    if (!created) throw new ValidationError('not_found');
    return created;
  });
}

export function updateTransaction(db: Db, id: string, input: TransactionInput, now = Date.now()): TransactionRow {
  return db.transaction((tx) => {
    const existing = tx.select().from(transactions).where(eq(transactions.id, id)).get();
    if (!existing) throw new ValidationError('not_found');
    const resolved = resolve(tx, input);
    writeRows(tx, id, input, resolved, existing, now);
    const updated = tx.select().from(transactions).where(eq(transactions.id, id)).get();
    if (!updated) throw new ValidationError('not_found');
    return updated;
  });
}

/** Deletes and returns what is needed to undo with {@link restoreTransaction}. */
export function deleteTransaction(db: Db, id: string): TransactionSnapshot | undefined {
  return db.transaction((tx) => {
    const row = tx.select().from(transactions).where(eq(transactions.id, id)).get();
    if (!row) return undefined;
    const splits = tx
      .select()
      .from(transactionSplits)
      .where(eq(transactionSplits.transactionId, id))
      .orderBy(transactionSplits.sortOrder)
      .all();
    const tagIds = tx.select({ id: transactionTags.tagId }).from(transactionTags).where(eq(transactionTags.transactionId, id)).all().map((r) => r.id);
    const files = tx.select().from(attachments).where(eq(attachments.transactionId, id)).all();
    tx.delete(transactions).where(eq(transactions.id, id)).run();
    return { transaction: row, splits, tagIds, attachments: files };
  });
}

export function restoreTransaction(db: Db, snapshot: TransactionSnapshot): void {
  db.transaction((tx) => {
    tx.insert(transactions).values(snapshot.transaction).run();
    if (snapshot.splits.length > 0) tx.insert(transactionSplits).values(snapshot.splits).run();
    const tagIds = snapshot.tagIds ?? [];
    if (tagIds.length > 0) {
      // Tags deleted since the snapshot was taken are simply skipped.
      const alive = new Set(tx.select({ id: tags.id }).from(tags).where(inArray(tags.id, tagIds)).all().map((t) => t.id));
      const live = tagIds.filter((id) => alive.has(id));
      if (live.length > 0) tx.insert(transactionTags).values(live.map((tagId) => ({ transactionId: snapshot.transaction.id, tagId }))).run();
    }
    if (snapshot.attachments && snapshot.attachments.length > 0) tx.insert(attachments).values(snapshot.attachments).run();
  });
}
