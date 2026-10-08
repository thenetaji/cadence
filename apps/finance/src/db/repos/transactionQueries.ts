import {
  and,
  between,
  desc,
  eq,
  inArray,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { ALL_DATES } from "@studio/dates";
import {
  currencyCodesWithDigits,
  DISTINCT_DIGITS,
  parseAmountText,
} from "@studio/money";
import {
  accounts,
  categories,
  people,
  tags,
  transactionSplits,
  transactionTags,
  transactions,
  type AttachmentRow,
  type TransactionKind,
  type TransactionRow,
} from "../schema";
import type { Db } from "../types";
import { listAttachmentsFor } from "./attachments";
import type { PersonRef } from "./people";
import type { TagRef } from "./tags";

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
  /** Alphabetical. */
  tags: TagRef[];
  /** The counterparty of a lending kind. */
  person: PersonRef | null;
  attachments: AttachmentRow[];
}

export interface PeriodFilter {
  /** Inclusive date keys. */
  from: string;
  to: string;
  kinds?: readonly TransactionKind[];
  categoryId?: string;
  accountId?: string;
  /** Only transactions carrying this tag. */
  tagId?: string;
  /** Only lending transactions with this person. */
  personId?: string;
}

const SEARCH_LIMIT = 200;
const IN_CHUNK = 500;

const transferAccounts = alias(accounts, "transfer_accounts");

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
      personName: people.name,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .leftJoin(
      transferAccounts,
      eq(transactions.transferAccountId, transferAccounts.id),
    )
    .leftJoin(people, eq(transactions.personId, people.id));
}

type BaseRow =
  ReturnType<typeof baseSelect> extends { all(): (infer R)[] } ? R : never;

function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size)
    out.push(items.slice(i, i + size));
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
        category: {
          id: r.categoryId,
          name: r.name,
          icon: r.icon,
          color: r.color,
        },
      });
      byTx.set(r.transactionId, list);
    }
  }
  return byTx;
}

function loadTags(db: Db, ids: readonly string[]): Map<string, TagRef[]> {
  const byTx = new Map<string, TagRef[]>();
  for (const part of chunk(ids, IN_CHUNK)) {
    const rows = db
      .select({
        transactionId: transactionTags.transactionId,
        id: tags.id,
        name: tags.name,
        color: tags.color,
      })
      .from(transactionTags)
      .innerJoin(tags, eq(tags.id, transactionTags.tagId))
      .where(inArray(transactionTags.transactionId, part))
      .orderBy(sql`lower(${tags.name}) asc`)
      .all();
    for (const r of rows)
      byTx.set(r.transactionId, [
        ...(byTx.get(r.transactionId) ?? []),
        { id: r.id, name: r.name, color: r.color },
      ]);
  }
  return byTx;
}

function hydrate(db: Db, rows: readonly BaseRow[]): TransactionListItem[] {
  const ids = rows.map((r) => r.tx.id);
  const tagMap = loadTags(db, ids);
  const files = listAttachmentsFor(db, ids);
  const splits = loadSplits(
    db,
    rows.filter((r) => r.tx.isSplit).map((r) => r.tx.id),
  );
  return rows.map((r) => ({
    ...r.tx,
    category:
      r.categoryId &&
      r.categoryName !== null &&
      r.categoryIcon !== null &&
      r.categoryColor !== null
        ? {
            id: r.categoryId,
            name: r.categoryName,
            icon: r.categoryIcon,
            color: r.categoryColor,
          }
        : null,
    account: {
      id: r.tx.accountId,
      name: r.accountName,
      icon: r.accountIcon,
      color: r.accountColor,
      currency: r.accountCurrency,
    },
    transferAccount:
      r.toId &&
      r.toName !== null &&
      r.toIcon !== null &&
      r.toColor !== null &&
      r.toCurrency !== null
        ? {
            id: r.toId,
            name: r.toName,
            icon: r.toIcon,
            color: r.toColor,
            currency: r.toCurrency,
          }
        : null,
    splits: splits.get(r.tx.id) ?? [],
    tags: tagMap.get(r.tx.id) ?? [],
    person:
      r.tx.personId && r.personName !== null
        ? { id: r.tx.personId, name: r.personName }
        : null,
    attachments: files.get(r.tx.id) ?? [],
  }));
}

const newestFirst = [
  desc(transactions.dateKey),
  desc(transactions.occurredAt),
] as const;

/** Every transaction carrying the tag, newest first; narrowed to a period when given. */
export function transactionsForTag(
  db: Db,
  tagId: string,
  period?: { from: string; to: string },
): TransactionListItem[] {
  return listForPeriod(db, {
    from: period?.from ?? ALL_DATES.from,
    to: period?.to ?? ALL_DATES.to,
    tagId,
  });
}

export function getTransaction(
  db: Db,
  id: string,
): TransactionListItem | undefined {
  const rows = baseSelect(db).where(eq(transactions.id, id)).all();
  return hydrate(db, rows)[0];
}

export function listForPeriod(
  db: Db,
  filter: PeriodFilter,
): TransactionListItem[] {
  const conditions: (SQL | undefined)[] = [
    between(transactions.dateKey, filter.from, filter.to),
  ];
  if (filter.kinds && filter.kinds.length > 0)
    conditions.push(inArray(transactions.kind, [...filter.kinds]));
  if (filter.accountId) {
    conditions.push(
      or(
        eq(transactions.accountId, filter.accountId),
        eq(transactions.transferAccountId, filter.accountId),
      ),
    );
  }
  if (filter.categoryId) {
    conditions.push(
      or(
        eq(transactions.categoryId, filter.categoryId),
        sql`exists (select 1 from ${transactionSplits} where ${transactionSplits.transactionId} = ${transactions.id} and ${transactionSplits.categoryId} = ${filter.categoryId})`,
      ),
    );
  }
  if (filter.tagId) {
    conditions.push(
      sql`exists (select 1 from ${transactionTags} where ${transactionTags.transactionId} = ${transactions.id} and ${transactionTags.tagId} = ${filter.tagId})`,
    );
  }
  if (filter.personId)
    conditions.push(eq(transactions.personId, filter.personId));
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
    const probe = digits === 0 ? "JPY" : digits === 3 ? "KWD" : "USD";
    const minor = parseAmountText(text, probe);
    if (minor === null || minor <= 0) continue;
    const low = Math.floor(minor * 0.995);
    const high = Math.ceil(minor * 1.005);
    const codes = currencyCodesWithDigits(digits);
    const currencyClause =
      digits === 2
        ? sql`${transactions.currency} not in (${sql.join(
            DISTINCT_DIGITS.filter((d) => d !== 2)
              .flatMap(currencyCodesWithDigits)
              .map((c) => sql`${c}`),
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
  if (query === "") return [];
  const like = `%${escapeLike(query)}%`;
  const matches = or(
    sql`${transactions.title} like ${like} escape '\\'`,
    sql`${transactions.memo} like ${like} escape '\\'`,
    sql`${people.name} like ${like} escape '\\'`,
    sql`exists (select 1 from ${transactionTags} inner join ${tags} on ${tags.id} = ${transactionTags.tagId} where ${transactionTags.transactionId} = ${transactions.id} and ${tags.name} like ${like} escape '\\')`,
    ...amountClauses(query),
  );
  const rows = baseSelect(db)
    .where(matches)
    .orderBy(...newestFirst)
    .limit(SEARCH_LIMIT)
    .all();
  return hydrate(db, rows);
}
