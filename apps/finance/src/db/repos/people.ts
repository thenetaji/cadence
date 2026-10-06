import { asc, count, eq, sql } from 'drizzle-orm';
import { ALL_DATES } from '@studio/dates';
import { owedDelta } from '@/lib/ledger';
import { convertWithRates } from '@studio/money';
import { ValidationError } from '../errors';
import { newId } from '@studio/data';
import { accounts, people, transactions, type PersonRow, type TransactionKind } from '../schema';
import type { Db } from '../types';
import { getRateLookup } from './fx';
import { getSetting } from './settings';
import { createTransaction } from './transactions';
import { listForPeriod, type TransactionListItem } from './transactionQueries';

export type PersonRef = Pick<PersonRow, 'id' | 'name'>;

const normName = (name: string) => name.trim().replace(/\s+/g, ' ');

function assertName(db: Db, name: string, excludingId?: string): string {
  const clean = normName(name);
  if (clean === '') throw new ValidationError('invalid_input', 'name is required');
  const clash = db
    .select({ id: people.id })
    .from(people)
    .where(sql`lower(${people.name}) = ${clean.toLowerCase()}`)
    .all()
    .some((row) => row.id !== excludingId);
  if (clash) throw new ValidationError('duplicate_name');
  return clean;
}

export function getPerson(db: Db, id: string): PersonRow | undefined {
  return db.select().from(people).where(eq(people.id, id)).get();
}

export function getPersonByName(db: Db, name: string): PersonRow | undefined {
  return db
    .select()
    .from(people)
    .where(sql`lower(${people.name}) = ${normName(name).toLowerCase()}`)
    .get();
}

export function listPeople(db: Db): PersonRow[] {
  return db.select().from(people).orderBy(sql`lower(${people.name}) asc`, asc(people.createdAt)).all();
}

export function createPerson(db: Db, input: { name: string }, now = Date.now()): PersonRow {
  const row: PersonRow = { id: newId(), name: assertName(db, input.name), createdAt: now };
  db.insert(people).values(row).run();
  return row;
}

export function updatePerson(db: Db, id: string, patch: { name: string }): void {
  if (!getPerson(db, id)) throw new ValidationError('person_not_found');
  db.update(people).set({ name: assertName(db, patch.name, id) }).where(eq(people.id, id)).run();
}

export function findOrCreatePerson(db: Db, name: string, now = Date.now()): PersonRow {
  return getPersonByName(db, name) ?? createPerson(db, { name }, now);
}

/** A person with lending history cannot be deleted; delete or reassign those transactions first. */
export function deletePerson(db: Db, id: string): void {
  const used = db.select({ n: count() }).from(transactions).where(eq(transactions.personId, id)).get()?.n ?? 0;
  if (used > 0) throw new ValidationError('in_use', 'person still has transactions');
  db.delete(people).where(eq(people.id, id)).run();
}

export interface CurrencyBalance {
  currency: string;
  /** Positive: they owe me. Negative: I owe them. Minor units of `currency`. */
  amount: number;
}

export interface PersonOutstanding {
  person: PersonRow;
  /** Non-zero balances, one per currency, largest magnitude first. */
  balances: CurrencyBalance[];
  /** All balances converted to the display currency (unknown rates leave an amount unconverted). */
  total: number;
  currency: string;
  /** Latest lending transaction time, ms. */
  lastActivityAt: number | null;
}

function balancesFor(db: Db, personId?: string): Map<string, Map<string, number>> {
  const rows = db
    .select({ personId: transactions.personId, kind: transactions.kind, currency: transactions.currency, amount: sql<number>`sum(${transactions.amount})` })
    .from(transactions)
    .where(personId ? eq(transactions.personId, personId) : sql`${transactions.personId} is not null`)
    .groupBy(transactions.personId, transactions.kind, transactions.currency)
    .all();
  const out = new Map<string, Map<string, number>>();
  for (const row of rows) {
    if (!row.personId) continue;
    const delta = owedDelta(row.kind);
    if (delta === 0) continue;
    const byCurrency = out.get(row.personId) ?? new Map<string, number>();
    byCurrency.set(row.currency, (byCurrency.get(row.currency) ?? 0) + delta * row.amount);
    out.set(row.personId, byCurrency);
  }
  return out;
}

function toBalances(byCurrency: Map<string, number> | undefined): CurrencyBalance[] {
  return [...(byCurrency ?? [])]
    .filter(([, amount]) => amount !== 0)
    .map(([currency, amount]) => ({ currency, amount }))
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount) || a.currency.localeCompare(b.currency));
}

/**
 * Who owes whom: lent and repaid_by_me add to a person's balance, borrowed and repaid_to_me subtract.
 * Settled people (every balance zero) are left out unless `includeSettled`. Largest absolute total first.
 */
export function outstandingByPerson(db: Db, options: { includeSettled?: boolean } = {}): PersonOutstanding[] {
  const currency = getSetting(db, 'display_currency');
  const rates = getRateLookup(db);
  const balances = balancesFor(db);
  const last = new Map(
    db
      .select({ personId: transactions.personId, at: sql<number>`max(${transactions.occurredAt})` })
      .from(transactions)
      .where(sql`${transactions.personId} is not null`)
      .groupBy(transactions.personId)
      .all()
      .map((r) => [r.personId, r.at]),
  );
  const out: PersonOutstanding[] = [];
  for (const person of listPeople(db)) {
    const list = toBalances(balances.get(person.id));
    if (list.length === 0 && !options.includeSettled) continue;
    const total = list.reduce((sum, b) => sum + convertWithRates(b.amount, b.currency, currency, rates), 0);
    out.push({ person, balances: list, total, currency, lastActivityAt: last.get(person.id) ?? null });
  }
  return out.sort((a, b) => Math.abs(b.total) - Math.abs(a.total) || a.person.name.localeCompare(b.person.name));
}

export interface OutstandingTotals {
  currency: string;
  /** Sum of positive person totals: what others owe me. */
  owedToMe: number;
  /** Sum of negative person totals, as a positive number: what I owe others. */
  iOwe: number;
}

export function outstandingTotals(db: Db): OutstandingTotals {
  const rows = outstandingByPerson(db);
  return {
    currency: getSetting(db, 'display_currency'),
    owedToMe: rows.reduce((sum, r) => sum + Math.max(r.total, 0), 0),
    iOwe: rows.reduce((sum, r) => sum + Math.max(-r.total, 0), 0),
  };
}

export interface PersonHistoryEntry {
  item: TransactionListItem;
  /** Change to the balance in the transaction's currency: positive = they owe me more. */
  signed: number;
  /** Balance in that currency right after this entry. */
  balanceAfter: number;
}

export interface PersonHistory {
  person: PersonRow;
  balances: CurrencyBalance[];
  total: number;
  currency: string;
  /** Newest first. */
  entries: PersonHistoryEntry[];
}

export function personHistory(db: Db, personId: string): PersonHistory | undefined {
  const person = getPerson(db, personId);
  if (!person) return undefined;
  const currency = getSetting(db, 'display_currency');
  const rates = getRateLookup(db);
  const items = listForPeriod(db, { from: ALL_DATES.from, to: ALL_DATES.to, personId });
  const running = new Map<string, number>();
  const oldestFirst = [...items].reverse();
  const entries = oldestFirst.map((item): PersonHistoryEntry => {
    const signed = owedDelta(item.kind) * item.amount;
    const balanceAfter = (running.get(item.currency) ?? 0) + signed;
    running.set(item.currency, balanceAfter);
    return { item, signed, balanceAfter };
  });
  const balances = toBalances(running);
  return {
    person,
    balances,
    total: balances.reduce((sum, b) => sum + convertWithRates(b.amount, b.currency, currency, rates), 0),
    currency,
    entries: entries.reverse(),
  };
}

export interface SettleInput {
  personId: string;
  /** Positive minor units in the account's currency; at most what is outstanding in that currency. */
  amount: number;
  accountId: string;
  occurredAt?: number;
  memo?: string;
}

/**
 * Records a repayment that moves the person's balance in the account's currency towards zero:
 * `repaid_to_me` when they owe me, `repaid_by_me` when I owe them.
 */
export function settle(db: Db, input: SettleInput, now = Date.now()) {
  return db.transaction((tx) => {
    const person = getPerson(tx, input.personId);
    if (!person) throw new ValidationError('person_not_found');
    const account = tx.select().from(accounts).where(eq(accounts.id, input.accountId)).get();
    if (!account) throw new ValidationError('account_not_found');
    if (!Number.isInteger(input.amount)) throw new ValidationError('amount_not_integer');
    if (input.amount <= 0) throw new ValidationError('amount_not_positive');
    const balance = balancesFor(tx, input.personId).get(input.personId)?.get(account.currency) ?? 0;
    if (balance === 0) throw new ValidationError('nothing_outstanding');
    if (input.amount > Math.abs(balance)) throw new ValidationError('invalid_input', 'amount exceeds the outstanding balance');
    const kind: TransactionKind = balance > 0 ? 'repaid_to_me' : 'repaid_by_me';
    return createTransaction(
      tx,
      { kind, amount: input.amount, accountId: account.id, personId: person.id, memo: input.memo, occurredAt: input.occurredAt ?? now },
      now,
    );
  });
}
