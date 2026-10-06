import { asc, eq, inArray } from 'drizzle-orm';
import { ValidationError } from '../errors';
import { newId } from '../ids';
import { attachments, transactions, type AttachmentRow } from '../schema';
import type { Db } from '../types';

export interface AttachmentInput {
  transactionId: string;
  /** Where the app stored the copied file (see `@/lib/files/attachments`). */
  uri: string;
  width?: number | null;
  height?: number | null;
}

/** Metadata only; files are copied and deleted by `@/lib/files/attachments`. */
export function addAttachment(db: Db, input: AttachmentInput, now = Date.now()): AttachmentRow {
  const exists = db.select({ id: transactions.id }).from(transactions).where(eq(transactions.id, input.transactionId)).get();
  if (!exists) throw new ValidationError('not_found');
  const row: AttachmentRow = {
    id: newId(),
    transactionId: input.transactionId,
    uri: input.uri,
    width: input.width ?? null,
    height: input.height ?? null,
    createdAt: now,
  };
  db.insert(attachments).values(row).run();
  return row;
}

export function listAttachments(db: Db, transactionId: string): AttachmentRow[] {
  return db.select().from(attachments).where(eq(attachments.transactionId, transactionId)).orderBy(asc(attachments.createdAt), asc(attachments.id)).all();
}

export function listAttachmentsFor(db: Db, transactionIds: readonly string[]): Map<string, AttachmentRow[]> {
  const out = new Map<string, AttachmentRow[]>();
  for (let i = 0; i < transactionIds.length; i += 500) {
    const rows = db
      .select()
      .from(attachments)
      .where(inArray(attachments.transactionId, transactionIds.slice(i, i + 500)))
      .orderBy(asc(attachments.createdAt), asc(attachments.id))
      .all();
    for (const row of rows) out.set(row.transactionId, [...(out.get(row.transactionId) ?? []), row]);
  }
  return out;
}

/** Returns the removed row so the caller can delete its file; undefined when it did not exist. */
export function removeAttachment(db: Db, id: string): AttachmentRow | undefined {
  const row = db.select().from(attachments).where(eq(attachments.id, id)).get();
  if (!row) return undefined;
  db.delete(attachments).where(eq(attachments.id, id)).run();
  return row;
}
