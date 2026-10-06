import { and, asc, eq, gt, isNull, lte, or } from 'drizzle-orm';
import { addDays, keyToLocalMs, weekday, type DateKey } from '@studio/dates';
import { defaultAnchorDay, nextDueDate, occurrencesBetween, type Frequency } from '@/lib/recurring';
import { ValidationError } from '../errors';
import { newId } from '../ids';
import { accounts, recurringRules, transactions, type RecurringKind, type RecurringRuleRow } from '../schema';
import type { Db } from '../types';
import { createTransaction, type TransactionInput } from './transactions';

export const POST_CAP_PER_RULE = 100;
const POST_HOUR = 9;

export interface RecurringInput {
  kind: RecurringKind;
  title: string;
  memo?: string;
  amount: number;
  accountId: string;
  categoryId?: string | null;
  transferAccountId?: string | null;
  transferAmount?: number | null;
  frequency: Frequency;
  interval?: number;
  startDate: DateKey;
  endDate?: DateKey | null;
  /** First occurrence still to post; defaults to startDate. */
  nextDue?: DateKey;
  autoPost?: boolean;
}

export type RecurringPatch = Partial<Omit<RecurringInput, 'kind'>>;

export interface Occurrence {
  rule: RecurringRuleRow;
  dueDate: DateKey;
}

export function getRule(db: Db, id: string): RecurringRuleRow | undefined {
  return db.select().from(recurringRules).where(eq(recurringRules.id, id)).get();
}

export function listRules(db: Db): RecurringRuleRow[] {
  return db.select().from(recurringRules).orderBy(asc(recurringRules.nextDue), asc(recurringRules.createdAt)).all();
}

function assertValid(input: Pick<RecurringInput, 'amount' | 'interval'>): void {
  if (!Number.isInteger(input.amount) || input.amount <= 0) throw new ValidationError('amount_not_positive');
  if (input.interval !== undefined && (!Number.isInteger(input.interval) || input.interval < 1)) {
    throw new ValidationError('invalid_input', 'interval must be at least 1');
  }
}

export function createRule(db: Db, input: RecurringInput, now = Date.now()): RecurringRuleRow {
  assertValid(input);
  const account = db.select().from(accounts).where(eq(accounts.id, input.accountId)).get();
  if (!account) throw new ValidationError('account_not_found');
  const row: RecurringRuleRow = {
    id: newId(),
    kind: input.kind,
    title: input.title.trim(),
    memo: (input.memo ?? '').trim(),
    amount: input.amount,
    currency: account.currency,
    accountId: input.accountId,
    categoryId: input.kind === 'transfer' ? null : (input.categoryId ?? null),
    transferAccountId: input.kind === 'transfer' ? (input.transferAccountId ?? null) : null,
    transferAmount: input.kind === 'transfer' ? (input.transferAmount ?? null) : null,
    frequency: input.frequency,
    interval: input.interval ?? 1,
    anchorDay: defaultAnchorDay(input.frequency, input.startDate, weekday),
    startDate: input.startDate,
    endDate: input.endDate ?? null,
    nextDue: input.nextDue ?? input.startDate,
    autoPost: input.autoPost ?? true,
    pausedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  db.insert(recurringRules).values(row).run();
  return row;
}

/** Edits affect future postings only; already posted transactions are untouched. */
export function updateRule(db: Db, id: string, patch: RecurringPatch, now = Date.now()): void {
  const current = getRule(db, id);
  if (!current) throw new ValidationError('not_found');
  assertValid({ amount: patch.amount ?? current.amount, interval: patch.interval });
  const frequency = patch.frequency ?? current.frequency;
  const startDate = patch.startDate ?? current.startDate;
  db.update(recurringRules)
    .set({
      ...(patch.title !== undefined && { title: patch.title.trim() }),
      ...(patch.memo !== undefined && { memo: patch.memo.trim() }),
      ...(patch.amount !== undefined && { amount: patch.amount }),
      ...(patch.accountId !== undefined && { accountId: patch.accountId }),
      ...(patch.categoryId !== undefined && { categoryId: patch.categoryId }),
      ...(patch.transferAccountId !== undefined && { transferAccountId: patch.transferAccountId }),
      ...(patch.transferAmount !== undefined && { transferAmount: patch.transferAmount }),
      ...(patch.interval !== undefined && { interval: patch.interval }),
      ...(patch.endDate !== undefined && { endDate: patch.endDate }),
      ...(patch.nextDue !== undefined && { nextDue: patch.nextDue }),
      ...(patch.autoPost !== undefined && { autoPost: patch.autoPost }),
      frequency,
      startDate,
      anchorDay: defaultAnchorDay(frequency, startDate, weekday),
      updatedAt: now,
    })
    .where(eq(recurringRules.id, id))
    .run();
}

export function setRulePaused(db: Db, id: string, paused: boolean, now = Date.now()): void {
  db.update(recurringRules).set({ pausedAt: paused ? now : null, updatedAt: now }).where(eq(recurringRules.id, id)).run();
}

export function countFuturePosted(db: Db, ruleId: string, todayKey: DateKey): number {
  return db
    .select({ id: transactions.id })
    .from(transactions)
    .where(and(eq(transactions.recurringRuleId, ruleId), gt(transactions.dateKey, todayKey)))
    .all().length;
}

/** Deletes the rule, keeping posted transactions (unlinked) unless `deleteFuturePosted` removes those after today. */
export function deleteRule(db: Db, id: string, options: { deleteFuturePosted?: boolean; todayKey?: DateKey } = {}): void {
  db.transaction((tx) => {
    if (options.deleteFuturePosted && options.todayKey) {
      tx.delete(transactions)
        .where(and(eq(transactions.recurringRuleId, id), gt(transactions.dateKey, options.todayKey)))
        .run();
    }
    tx.update(transactions).set({ recurringRuleId: null }).where(eq(transactions.recurringRuleId, id)).run();
    tx.delete(recurringRules).where(eq(recurringRules.id, id)).run();
  });
}

function toTransactionInput(rule: RecurringRuleRow, dueDate: DateKey): TransactionInput {
  return {
    kind: rule.kind,
    title: rule.title,
    memo: rule.memo,
    amount: rule.amount,
    accountId: rule.accountId,
    categoryId: rule.categoryId,
    transferAccountId: rule.transferAccountId,
    transferAmount: rule.transferAmount,
    occurredAt: keyToLocalMs(dueDate, POST_HOUR),
    recurringRuleId: rule.id,
  };
}

function advance(db: Db, rule: RecurringRuleRow, nextDue: DateKey, now: number): void {
  db.update(recurringRules).set({ nextDue, updatedAt: now }).where(eq(recurringRules.id, rule.id)).run();
}

export interface PostResult {
  posted: number;
  transactionIds: string[];
}

/** Posts every auto-post occurrence due on or before `todayKey`; safe to call repeatedly. */
export function postDue(db: Db, todayKey: DateKey, now = Date.now()): PostResult {
  const due = db
    .select()
    .from(recurringRules)
    .where(
      and(
        isNull(recurringRules.pausedAt),
        eq(recurringRules.autoPost, true),
        lte(recurringRules.nextDue, todayKey),
        or(isNull(recurringRules.endDate), lte(recurringRules.nextDue, recurringRules.endDate)),
      ),
    )
    .all();
  const transactionIds: string[] = [];
  for (const rule of due) {
    try {
      db.transaction((tx) => {
        let nextDue = rule.nextDue;
        let count = 0;
        while (nextDue <= todayKey && (rule.endDate === null || nextDue <= rule.endDate) && count < POST_CAP_PER_RULE) {
          transactionIds.push(createTransaction(tx, toTransactionInput(rule, nextDue), now).id);
          nextDue = nextDueDate(rule, nextDue);
          count += 1;
        }
        advance(tx, rule, nextDue, now);
      });
    } catch (error) {
      if (!(error instanceof ValidationError)) throw error;
      // Unpostable rule (e.g. its account was archived into an invalid state): leave it due and continue.
    }
  }
  return { posted: transactionIds.length, transactionIds };
}

/** Posts the rule's next occurrence immediately and advances it. */
export function postNow(db: Db, ruleId: string, now = Date.now()): string {
  return db.transaction((tx) => {
    const rule = getRule(tx, ruleId);
    if (!rule) throw new ValidationError('not_found');
    const id = createTransaction(tx, toTransactionInput(rule, rule.nextDue), now).id;
    advance(tx, rule, nextDueDate(rule, rule.nextDue), now);
    return id;
  });
}

export function skip(db: Db, ruleId: string, now = Date.now()): void {
  const rule = getRule(db, ruleId);
  if (!rule) throw new ValidationError('not_found');
  advance(db, rule, nextDueDate(rule, rule.nextDue), now);
}

const UPCOMING_PER_RULE = 50;

/** Occurrences due from each unpaused rule's next_due through today + `days`, soonest first. */
export function upcoming(db: Db, todayKey: DateKey, days: number): Occurrence[] {
  const horizon = addDays(todayKey, days);
  const rules = db
    .select()
    .from(recurringRules)
    .where(and(isNull(recurringRules.pausedAt), lte(recurringRules.nextDue, horizon)))
    .all();
  const out: Occurrence[] = [];
  for (const rule of rules) {
    for (const dueDate of occurrencesBetween(rule, rule.nextDue, horizon, { endDate: rule.endDate, limit: UPCOMING_PER_RULE })) {
      out.push({ rule, dueDate });
    }
  }
  return out.sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.rule.title.localeCompare(b.rule.title));
}

