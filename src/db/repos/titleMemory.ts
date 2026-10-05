import { and, eq, sql } from 'drizzle-orm';
import { titleMemory, type CategoryKind, type TitleMemoryRow } from '../schema';
import type { Db } from '../types';

export function normalizeTitle(title: string): string {
  return title.trim().replace(/\s+/g, ' ').toLowerCase();
}

export interface TitleMemoryInput {
  title: string;
  kind: CategoryKind;
  categoryId: string | null;
  accountId: string | null;
  amount: number;
  currency: string;
  now: number;
}

export function recordTitle(db: Db, input: TitleMemoryInput): void {
  const titleNorm = normalizeTitle(input.title);
  if (titleNorm === '') return;
  const values = {
    title: input.title.trim().replace(/\s+/g, ' '),
    kind: input.kind,
    categoryId: input.categoryId,
    accountId: input.accountId,
    lastAmount: input.amount,
    lastCurrency: input.currency,
    lastUsedAt: input.now,
  };
  db.insert(titleMemory)
    .values({ titleNorm, ...values, useCount: 1 })
    .onConflictDoUpdate({
      target: titleMemory.titleNorm,
      set: { ...values, useCount: sql`${titleMemory.useCount} + 1` },
    })
    .run();
}

const escapeLike = (text: string) => text.replace(/[\\%_]/g, (c) => `\\${c}`);

/** Prefix matches first, then substring matches; each ranked by use count then recency. */
export function suggest(db: Db, prefix: string, kind: CategoryKind, limit = 4): TitleMemoryRow[] {
  const needle = normalizeTitle(prefix);
  if (needle === '') return [];
  const pattern = escapeLike(needle);
  const prefixHits = db
    .select()
    .from(titleMemory)
    .where(and(eq(titleMemory.kind, kind), sql`${titleMemory.titleNorm} like ${`${pattern}%`} escape '\\'`))
    .orderBy(sql`${titleMemory.useCount} desc`, sql`${titleMemory.lastUsedAt} desc`)
    .limit(limit)
    .all();
  if (prefixHits.length >= limit) return prefixHits;
  const taken = new Set(prefixHits.map((r) => r.titleNorm));
  const substringHits = db
    .select()
    .from(titleMemory)
    .where(and(eq(titleMemory.kind, kind), sql`${titleMemory.titleNorm} like ${`%${pattern}%`} escape '\\'`))
    .orderBy(sql`${titleMemory.useCount} desc`, sql`${titleMemory.lastUsedAt} desc`)
    .limit(limit + taken.size)
    .all()
    .filter((r) => !taken.has(r.titleNorm));
  return [...prefixHits, ...substringHits].slice(0, limit);
}
