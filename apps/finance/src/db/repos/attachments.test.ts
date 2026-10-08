/** @jest-environment node */
import { ValidationError } from "../errors";
import { at, categoryId, createTestDb, makeAccounts } from "../test-helpers";
import {
  addAttachment,
  listAttachments,
  removeAttachment,
} from "./attachments";
import {
  createTransaction,
  deleteTransaction,
  getTransaction,
  restoreTransaction,
} from "./transactions";

const setup = () => {
  const db = createTestDb();
  const { cash } = makeAccounts(db);
  const tx = createTransaction(db, {
    kind: "expense",
    amount: 100,
    accountId: cash.id,
    categoryId: categoryId(db, "Groceries"),
    occurredAt: at("2026-10-01"),
  });
  return { db, tx };
};

describe("attachments", () => {
  it("stores metadata, lists oldest first and includes them on transaction items", () => {
    const { db, tx } = setup();
    const a = addAttachment(
      db,
      { transactionId: tx.id, uri: "file:///a.jpg", width: 640, height: 480 },
      1,
    );
    const b = addAttachment(
      db,
      { transactionId: tx.id, uri: "file:///b.png" },
      2,
    );
    expect(listAttachments(db, tx.id).map((r) => r.id)).toEqual([a.id, b.id]);
    expect(b).toMatchObject({ width: null, height: null });
    expect(getTransaction(db, tx.id)?.attachments.map((r) => r.uri)).toEqual([
      "file:///a.jpg",
      "file:///b.png",
    ]);
  });

  it("rejects an unknown transaction", () => {
    const { db } = setup();
    expect(() =>
      addAttachment(db, { transactionId: "ghost", uri: "x" }),
    ).toThrow(ValidationError);
  });

  it("returns the removed row so its file can be deleted", () => {
    const { db, tx } = setup();
    const a = addAttachment(db, { transactionId: tx.id, uri: "file:///a.jpg" });
    expect(removeAttachment(db, a.id)).toMatchObject({ uri: "file:///a.jpg" });
    expect(removeAttachment(db, a.id)).toBeUndefined();
    expect(listAttachments(db, tx.id)).toEqual([]);
  });

  it("cascades on transaction delete and comes back with undo", () => {
    const { db, tx } = setup();
    addAttachment(db, { transactionId: tx.id, uri: "file:///a.jpg" });
    const snap = deleteTransaction(db, tx.id);
    expect(listAttachments(db, tx.id)).toEqual([]);
    if (!snap) throw new Error("snapshot expected");
    expect(snap.attachments).toHaveLength(1);
    restoreTransaction(db, snap);
    expect(listAttachments(db, tx.id)).toHaveLength(1);
  });
});
