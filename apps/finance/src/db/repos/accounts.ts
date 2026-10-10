import { and, asc, count, eq, isNull, ne, or, sql } from "drizzle-orm";
import { ValidationError } from "../errors";
import { newId } from "@studio/data";
import {
  accounts,
  recurringRules,
  titleMemory,
  transactions,
  type AccountRow,
  type AccountType,
} from "../schema";
import type { Db } from "../types";
import { setSetting } from "./settings";

export const ACCOUNT_ICONS: Readonly<Record<AccountType, string>> = {
  cash: "banknote",
  bank: "building.columns.fill",
  card: "creditcard.fill",
  other: "wallet.pass.fill",
};

export interface AccountInput {
  name: string;
  type: AccountType;
  currency: string;
  openingBalance?: number;
  color: string;
  icon?: string;
  isDefault?: boolean;
}

export type AccountPatch = Partial<Omit<AccountInput, "isDefault">>;

export interface AccountWithBalance extends AccountRow {
  /** In the account's own currency. */
  balance: number;
}

export function getAccount(db: Db, id: string): AccountRow | undefined {
  return db.select().from(accounts).where(eq(accounts.id, id)).get();
}

export function listAccounts(
  db: Db,
  options: { includeArchived?: boolean } = {},
): AccountRow[] {
  const query = db.select().from(accounts);
  const rows = options.includeArchived
    ? query
    : query.where(isNull(accounts.archivedAt));
  return rows.orderBy(asc(accounts.sortOrder), asc(accounts.createdAt)).all();
}

export function createAccount(
  db: Db,
  input: AccountInput,
  now = Date.now(),
): AccountRow {
  return db.transaction((tx) => {
    const last = tx
      .select({ max: sql<number | null>`max(${accounts.sortOrder})` })
      .from(accounts)
      .get();
    const existing = tx.select({ n: count() }).from(accounts).get()?.n ?? 0;
    const row: AccountRow = {
      id: newId(),
      name: input.name.trim(),
      type: input.type,
      currency: input.currency.toUpperCase(),
      openingBalance: input.openingBalance ?? 0,
      color: input.color,
      icon: input.icon ?? ACCOUNT_ICONS[input.type],
      isDefault: false,
      sortOrder: (last?.max ?? -1) + 1,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    tx.insert(accounts).values(row).run();
    if (input.isDefault || existing === 0) setDefaultAccount(tx, row.id);
    return getAccount(tx, row.id) ?? row;
  });
}

export function updateAccount(
  db: Db,
  id: string,
  patch: AccountPatch,
  now = Date.now(),
): void {
  const current = getAccount(db, id);
  if (!current) throw new ValidationError("account_not_found");
  const currency = patch.currency?.toUpperCase();
  if (
    currency &&
    currency !== current.currency &&
    countAccountReferences(db, id) > 0
  ) {
    throw new ValidationError(
      "currency_mismatch",
      "currency is locked once an account has transactions",
    );
  }
  db.update(accounts)
    .set({
      ...(patch.name !== undefined && { name: patch.name.trim() }),
      ...(patch.type !== undefined && { type: patch.type }),
      ...(currency !== undefined && { currency }),
      ...(patch.openingBalance !== undefined && {
        openingBalance: patch.openingBalance,
      }),
      ...(patch.color !== undefined && { color: patch.color }),
      ...(patch.icon !== undefined && { icon: patch.icon }),
      updatedAt: now,
    })
    .where(eq(accounts.id, id))
    .run();
}

export function setDefaultAccount(db: Db, id: string): void {
  db.transaction((tx) => {
    tx.update(accounts)
      .set({ isDefault: false })
      .where(ne(accounts.id, id))
      .run();
    tx.update(accounts)
      .set({ isDefault: true })
      .where(eq(accounts.id, id))
      .run();
    setSetting(tx, "default_account_id", id);
  });
}

export function archiveAccount(db: Db, id: string, now = Date.now()): void {
  db.transaction((tx) => {
    tx.update(accounts)
      .set({ archivedAt: now, updatedAt: now })
      .where(eq(accounts.id, id))
      .run();
    const row = getAccount(tx, id);
    if (row?.isDefault) reassignDefault(tx, id);
  });
}

export function unarchiveAccount(db: Db, id: string, now = Date.now()): void {
  db.update(accounts)
    .set({ archivedAt: null, updatedAt: now })
    .where(eq(accounts.id, id))
    .run();
}

export function reorderAccounts(db: Db, orderedIds: readonly string[]): void {
  db.transaction((tx) => {
    orderedIds.forEach((id, index) => {
      tx.update(accounts)
        .set({ sortOrder: index })
        .where(eq(accounts.id, id))
        .run();
    });
  });
}

export function countAccountReferences(db: Db, id: string): number {
  const tx = db
    .select({ n: count() })
    .from(transactions)
    .where(
      or(
        eq(transactions.accountId, id),
        eq(transactions.transferAccountId, id),
      ),
    )
    .get();
  const rules = db
    .select({ n: count() })
    .from(recurringRules)
    .where(
      or(
        eq(recurringRules.accountId, id),
        eq(recurringRules.transferAccountId, id),
      ),
    )
    .get();
  return (tx?.n ?? 0) + (rules?.n ?? 0);
}

function reassignDefault(db: Db, excludingId: string): void {
  const next = db
    .select()
    .from(accounts)
    .where(and(ne(accounts.id, excludingId), isNull(accounts.archivedAt)))
    .orderBy(asc(accounts.sortOrder))
    .get();
  if (next) {
    setDefaultAccount(db, next.id);
  } else {
    db.update(accounts)
      .set({ isDefault: false })
      .where(eq(accounts.id, excludingId))
      .run();
    setSetting(db, "default_account_id", null);
  }
}

/**
 * Deletes an account. When it still has transactions or rules, `moveToId`
 * must name an account in the same currency that receives them.
 */
export function deleteAccount(db: Db, id: string, moveToId?: string): void {
  db.transaction((tx) => {
    const account = getAccount(tx, id);
    if (!account) throw new ValidationError("account_not_found");
    if (countAccountReferences(tx, id) > 0) {
      if (!moveToId) throw new ValidationError("target_required");
      if (moveToId === id) throw new ValidationError("invalid_input");
      const target = getAccount(tx, moveToId);
      if (!target) throw new ValidationError("account_not_found");
      if (target.currency !== account.currency)
        throw new ValidationError("currency_mismatch");
      moveAccountReferences(tx, id, moveToId);
    }
    if (account.isDefault) reassignDefault(tx, id);
    tx.delete(accounts).where(eq(accounts.id, id)).run();
  });
}

function moveAccountReferences(db: Db, from: string, to: string): void {
  const collision = db
    .select({ n: count() })
    .from(transactions)
    .where(
      or(
        and(
          eq(transactions.accountId, from),
          eq(transactions.transferAccountId, to),
        ),
        and(
          eq(transactions.accountId, to),
          eq(transactions.transferAccountId, from),
        ),
      ),
    )
    .get();
  if ((collision?.n ?? 0) > 0) throw new ValidationError("transfer_conflict");
  db.update(transactions)
    .set({ accountId: to })
    .where(eq(transactions.accountId, from))
    .run();
  db.update(transactions)
    .set({ transferAccountId: to })
    .where(eq(transactions.transferAccountId, from))
    .run();
  db.update(recurringRules)
    .set({ accountId: to })
    .where(eq(recurringRules.accountId, from))
    .run();
  db.update(recurringRules)
    .set({ transferAccountId: to })
    .where(eq(recurringRules.transferAccountId, from))
    .run();
  db.update(titleMemory)
    .set({ accountId: to })
    .where(eq(titleMemory.accountId, from))
    .run();
}

/**
 * opening + inflows - outflows - transfers out + transfers in, in each account's own currency.
 * Inflows: income, borrowed, repaid_to_me. Outflows: expense, lent, repaid_by_me.
 */
export function listAccountsWithBalances(
  db: Db,
  options: { includeArchived?: boolean } = {},
): AccountWithBalance[] {
  const rows = listAccounts(db, options);
  const flows = db
    .select({
      accountId: transactions.accountId,
      income: sql<number>`coalesce(sum(case when ${transactions.kind} in ('income', 'borrowed', 'repaid_to_me') then ${transactions.amount} end), 0)`,
      expense: sql<number>`coalesce(sum(case when ${transactions.kind} in ('expense', 'lent', 'repaid_by_me') then ${transactions.amount} end), 0)`,
      out: sql<number>`coalesce(sum(case when ${transactions.kind} = 'transfer' then ${transactions.amount} end), 0)`,
    })
    .from(transactions)
    .groupBy(transactions.accountId)
    .all();
  const incoming = db
    .select({
      accountId: transactions.transferAccountId,
      total: sql<number>`coalesce(sum(${transactions.transferAmount}), 0)`,
    })
    .from(transactions)
    .where(eq(transactions.kind, "transfer"))
    .groupBy(transactions.transferAccountId)
    .all();
  const flowById = new Map(flows.map((f) => [f.accountId, f]));
  const incomingById = new Map(incoming.map((i) => [i.accountId, i.total]));
  return rows.map((row) => {
    const flow = flowById.get(row.id);
    const balance =
      row.openingBalance +
      (flow?.income ?? 0) -
      (flow?.expense ?? 0) -
      (flow?.out ?? 0) +
      (incomingById.get(row.id) ?? 0);
    return { ...row, balance };
  });
}

export function getAccountBalance(db: Db, id: string): number | undefined {
  return listAccountsWithBalances(db, { includeArchived: true }).find(
    (a) => a.id === id,
  )?.balance;
}

/**
 * Net balance change per account per day, in each account's own currency, with the same signs as
 * `listAccountsWithBalances`: inflows add, outflows and transfers out subtract, transfers in add.
 */
export function balanceMovements(
  db: Db,
): { accountId: string; dateKey: string; delta: number }[] {
  const own = db
    .select({
      accountId: transactions.accountId,
      dateKey: transactions.dateKey,
      delta: sql<number>`coalesce(sum(case when ${transactions.kind} in ('income', 'borrowed', 'repaid_to_me') then ${transactions.amount} when ${transactions.kind} in ('expense', 'lent', 'repaid_by_me', 'transfer') then -${transactions.amount} else 0 end), 0)`,
    })
    .from(transactions)
    .groupBy(transactions.accountId, transactions.dateKey)
    .all();
  const incoming = db
    .select({
      accountId: transactions.transferAccountId,
      dateKey: transactions.dateKey,
      delta: sql<number>`coalesce(sum(${transactions.transferAmount}), 0)`,
    })
    .from(transactions)
    .where(eq(transactions.kind, "transfer"))
    .groupBy(transactions.transferAccountId, transactions.dateKey)
    .all();
  const out = own.filter((m) => m.delta !== 0);
  for (const m of incoming)
    if (m.accountId !== null && m.delta !== 0)
      out.push({ accountId: m.accountId, dateKey: m.dateKey, delta: m.delta });
  return out;
}
