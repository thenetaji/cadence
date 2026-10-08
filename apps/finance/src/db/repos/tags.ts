import { and, asc, between, eq, inArray, sql } from "drizzle-orm";
import { convertWithRates } from "@studio/money";
import { ValidationError } from "../errors";
import { newId } from "@studio/data";
import { tags, transactionTags, transactions, type TagRow } from "../schema";
import type { Db } from "../types";
import { getRateLookup } from "./fx";
import { getSetting } from "./settings";

export interface TagInput {
  name: string;
  /** A category palette key, e.g. 'blue'. */
  color: string;
}

export type TagPatch = Partial<TagInput>;

export type TagRef = Pick<TagRow, "id" | "name" | "color">;

const normName = (name: string) => name.trim().replace(/\s+/g, " ");

function assertName(db: Db, name: string, excludingId?: string): string {
  const clean = normName(name);
  if (clean === "")
    throw new ValidationError("invalid_input", "tag name is required");
  const clash = db
    .select({ id: tags.id })
    .from(tags)
    .where(sql`lower(${tags.name}) = ${clean.toLowerCase()}`)
    .all()
    .some((row) => row.id !== excludingId);
  if (clash) throw new ValidationError("duplicate_name");
  return clean;
}

export function getTag(db: Db, id: string): TagRow | undefined {
  return db.select().from(tags).where(eq(tags.id, id)).get();
}

export function getTagByName(db: Db, name: string): TagRow | undefined {
  return db
    .select()
    .from(tags)
    .where(sql`lower(${tags.name}) = ${normName(name).toLowerCase()}`)
    .get();
}

/** Alphabetical (case-insensitive). */
export function listTags(db: Db): TagRow[] {
  return db
    .select()
    .from(tags)
    .orderBy(sql`lower(${tags.name}) asc`, asc(tags.createdAt))
    .all();
}

export function createTag(db: Db, input: TagInput, now = Date.now()): TagRow {
  const name = assertName(db, input.name);
  const row: TagRow = { id: newId(), name, color: input.color, createdAt: now };
  db.insert(tags).values(row).run();
  return row;
}

export function updateTag(db: Db, id: string, patch: TagPatch): void {
  if (!getTag(db, id)) throw new ValidationError("tag_not_found");
  const name =
    patch.name === undefined ? undefined : assertName(db, patch.name, id);
  if (name === undefined && patch.color === undefined) return;
  db.update(tags)
    .set({
      ...(name !== undefined && { name }),
      ...(patch.color !== undefined && { color: patch.color }),
    })
    .where(eq(tags.id, id))
    .run();
}

/** Deleting a tag only removes it from transactions; the transactions stay. */
export function deleteTag(db: Db, id: string): void {
  db.delete(tags).where(eq(tags.id, id)).run();
}

/** Finds a tag by name (ignoring case) or creates it. */
export function findOrCreateTag(
  db: Db,
  name: string,
  color: string,
  now = Date.now(),
): TagRow {
  return getTagByName(db, name) ?? createTag(db, { name, color }, now);
}

/** Replaces the transaction's tags with exactly `tagIds` (duplicates ignored). */
export function setTransactionTags(
  db: Db,
  transactionId: string,
  tagIds: readonly string[],
): void {
  db.transaction((tx) => {
    const exists = tx
      .select({ id: transactions.id })
      .from(transactions)
      .where(eq(transactions.id, transactionId))
      .get();
    if (!exists) throw new ValidationError("not_found");
    replaceTransactionTags(tx, transactionId, tagIds);
  });
}

/** Used inside transaction writes; the transaction must already exist. */
export function replaceTransactionTags(
  db: Db,
  transactionId: string,
  tagIds: readonly string[],
): void {
  const unique = [...new Set(tagIds)];
  if (unique.length > 0) {
    const found = db
      .select({ id: tags.id })
      .from(tags)
      .where(inArray(tags.id, unique))
      .all();
    if (found.length !== unique.length)
      throw new ValidationError("tag_not_found");
  }
  db.delete(transactionTags)
    .where(eq(transactionTags.transactionId, transactionId))
    .run();
  if (unique.length > 0)
    db.insert(transactionTags)
      .values(unique.map((tagId) => ({ transactionId, tagId })))
      .run();
}

export function tagIdsFor(db: Db, transactionId: string): string[] {
  return db
    .select({ id: transactionTags.tagId })
    .from(transactionTags)
    .where(eq(transactionTags.transactionId, transactionId))
    .all()
    .map((r) => r.id);
}

export interface TagTotal {
  tag: TagRow;
  /** Expense transactions carrying the tag in the period, in the display currency. */
  spent: number;
  /** Income transactions carrying the tag, in the display currency. */
  earned: number;
  /** Spend plus income transactions in the period (lending kinds never count). */
  count: number;
  currency: string;
}

/**
 * Every tag with its totals for the period, biggest spend first (tags with no activity last).
 * Whole transactions count, not split lines; transfers and lending are excluded.
 */
export function listTagsWithTotals(
  db: Db,
  period: { from: string; to: string },
): TagTotal[] {
  const currency = getSetting(db, "display_currency");
  const rates = getRateLookup(db);
  const rows = db
    .select({
      tagId: transactionTags.tagId,
      kind: transactions.kind,
      currency: transactions.currency,
      amount: sql<number>`sum(${transactions.amount})`,
      count: sql<number>`count(*)`,
    })
    .from(transactionTags)
    .innerJoin(transactions, eq(transactions.id, transactionTags.transactionId))
    .where(
      and(
        between(transactions.dateKey, period.from, period.to),
        inArray(transactions.kind, ["expense", "income"]),
      ),
    )
    .groupBy(transactionTags.tagId, transactions.kind, transactions.currency)
    .all();
  const acc = new Map<
    string,
    { spent: number; earned: number; count: number }
  >();
  for (const row of rows) {
    const entry = acc.get(row.tagId) ?? { spent: 0, earned: 0, count: 0 };
    const converted = convertWithRates(
      row.amount,
      row.currency,
      currency,
      rates,
    );
    if (row.kind === "expense") entry.spent += converted;
    else entry.earned += converted;
    entry.count += row.count;
    acc.set(row.tagId, entry);
  }
  return listTags(db)
    .map((tag) => ({
      tag,
      spent: acc.get(tag.id)?.spent ?? 0,
      earned: acc.get(tag.id)?.earned ?? 0,
      count: acc.get(tag.id)?.count ?? 0,
      currency,
    }))
    .sort(
      (a, b) =>
        b.spent - a.spent ||
        b.count - a.count ||
        a.tag.name.localeCompare(b.tag.name),
    );
}
