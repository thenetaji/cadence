/** @jest-environment node */
import { buildExportCsv, parseNative, splitTags } from "@/lib/csv";
import { NATIVE_SAMPLE } from "@/lib/csv/fixtures";
import { ValidationError } from "../errors";
import { at, categoryId, createTestDb, makeAccounts } from "../test-helpers";
import { importTransactions, listForExport } from "./importer";
import { createPerson, outstandingByPerson } from "./people";
import { setRate } from "./fx";
import { setSetting } from "./settings";
import {
  createTag,
  deleteTag,
  findOrCreateTag,
  getTagByName,
  listTags,
  listTagsWithTotals,
  setTransactionTags,
  tagIdsFor,
  updateTag,
} from "./tags";
import {
  createTransaction,
  deleteTransaction,
  getTransaction,
  listForPeriod,
  restoreTransaction,
  search,
  transactionsForTag,
  updateTransaction,
} from "./transactions";

const code = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return e instanceof ValidationError ? e.code : "other";
  }
  return "none";
};

const setup = () => {
  const db = createTestDb();
  const accts = makeAccounts(db);
  const goa = createTag(db, { name: "Goa trip", color: "cyan" });
  const work = createTag(db, { name: "Work", color: "blue" });
  const food = categoryId(db, "Food & Drink");
  const add = (
    day: string,
    amount: number,
    tagIds: string[] = [],
    kind: "expense" | "income" = "expense",
    accountId = accts.cash.id,
  ) =>
    createTransaction(db, {
      kind,
      amount,
      accountId,
      categoryId: kind === "expense" ? food : categoryId(db, "Salary"),
      occurredAt: at(day),
      tagIds,
    });
  return { db, ...accts, goa, work, food, add };
};

describe("tags CRUD", () => {
  it("creates, renames, recolours and lists alphabetically", () => {
    const { db, goa } = setup();
    expect(listTags(db).map((t) => t.name)).toEqual(["Goa trip", "Work"]);
    updateTag(db, goa.id, { name: "  Goa   2026 ", color: "teal" });
    expect(listTags(db)[0]).toMatchObject({ name: "Goa 2026", color: "teal" });
    expect(getTagByName(db, "goa 2026")?.id).toBe(goa.id);
  });

  it("enforces unique names ignoring case and validates input", () => {
    const { db, goa } = setup();
    expect(code(() => createTag(db, { name: "WORK", color: "red" }))).toBe(
      "duplicate_name",
    );
    expect(code(() => createTag(db, { name: "  ", color: "red" }))).toBe(
      "invalid_input",
    );
    expect(code(() => updateTag(db, goa.id, { name: "work" }))).toBe(
      "duplicate_name",
    );
    expect(code(() => updateTag(db, "ghost", { color: "red" }))).toBe(
      "tag_not_found",
    );
    expect(() => updateTag(db, goa.id, { name: "goa trip" })).not.toThrow();
    expect(findOrCreateTag(db, "work", "red").id).not.toBe(goa.id);
    expect(listTags(db)).toHaveLength(2);
  });

  it("deleting a tag keeps its transactions", () => {
    const { db, goa, add } = setup();
    const tx = add("2026-10-02", 500, [goa.id]);
    deleteTag(db, goa.id);
    expect(getTransaction(db, tx.id)?.tags).toEqual([]);
    expect(getTransaction(db, tx.id)).toBeDefined();
  });
});

describe("tagging transactions", () => {
  it("sets, replaces and clears a transaction tags; items list them alphabetically", () => {
    const { db, goa, work, add } = setup();
    const tx = add("2026-10-02", 500);
    expect(getTransaction(db, tx.id)?.tags).toEqual([]);
    setTransactionTags(db, tx.id, [work.id, goa.id, work.id]);
    expect(getTransaction(db, tx.id)?.tags.map((t) => t.name)).toEqual([
      "Goa trip",
      "Work",
    ]);
    setTransactionTags(db, tx.id, [goa.id]);
    expect(tagIdsFor(db, tx.id)).toEqual([goa.id]);
    setTransactionTags(db, tx.id, []);
    expect(tagIdsFor(db, tx.id)).toEqual([]);
    expect(code(() => setTransactionTags(db, tx.id, ["ghost"]))).toBe(
      "tag_not_found",
    );
    expect(code(() => setTransactionTags(db, "ghost", []))).toBe("not_found");
  });

  it("takes tagIds on create and update (omitted on update keeps them)", () => {
    const { db, cash, goa, work, food } = setup();
    const input = {
      kind: "expense",
      amount: 100,
      accountId: cash.id,
      categoryId: food,
      occurredAt: at("2026-10-02"),
    } as const;
    const tx = createTransaction(db, { ...input, tagIds: [goa.id] });
    updateTransaction(db, tx.id, { ...input, amount: 200 });
    expect(tagIdsFor(db, tx.id)).toEqual([goa.id]);
    updateTransaction(db, tx.id, { ...input, tagIds: [work.id] });
    expect(tagIdsFor(db, tx.id)).toEqual([work.id]);
    expect(
      code(() => createTransaction(db, { ...input, tagIds: ["ghost"] })),
    ).toBe("tag_not_found");
    expect(
      listForPeriod(db, { from: "2026-10-01", to: "2026-10-31" }),
    ).toHaveLength(1);
  });

  it("cascades when the transaction is deleted and survives undo", () => {
    const { db, goa, work, add } = setup();
    const tx = add("2026-10-02", 500, [goa.id, work.id]);
    const snap = deleteTransaction(db, tx.id);
    expect(tagIdsFor(db, tx.id)).toEqual([]);
    if (!snap) throw new Error("snapshot expected");
    restoreTransaction(db, snap);
    expect(getTransaction(db, tx.id)?.tags.map((t) => t.name)).toEqual([
      "Goa trip",
      "Work",
    ]);
    // A tag deleted while the transaction is deleted is simply skipped on undo.
    const snap2 = deleteTransaction(db, tx.id);
    deleteTag(db, work.id);
    if (!snap2) throw new Error("snapshot expected");
    restoreTransaction(db, snap2);
    expect(getTransaction(db, tx.id)?.tags.map((t) => t.name)).toEqual([
      "Goa trip",
    ]);
  });

  it("lists transactions for a tag, optionally within a period, and filters periods by tag", () => {
    const { db, goa, work, add } = setup();
    add("2026-09-20", 100, [goa.id]);
    add("2026-10-02", 200, [goa.id, work.id]);
    add("2026-10-03", 300, [work.id]);
    expect(transactionsForTag(db, goa.id).map((t) => t.amount)).toEqual([
      200, 100,
    ]);
    expect(
      transactionsForTag(db, goa.id, {
        from: "2026-10-01",
        to: "2026-10-31",
      }).map((t) => t.amount),
    ).toEqual([200]);
    expect(
      listForPeriod(db, {
        from: "2026-10-01",
        to: "2026-10-31",
        tagId: work.id,
      }).map((t) => t.amount),
    ).toEqual([300, 200]);
    expect(transactionsForTag(db, goa.id)[0]?.tags.map((t) => t.name)).toEqual([
      "Goa trip",
      "Work",
    ]);
  });

  it("finds transactions by tag name in search", () => {
    const { db, goa, add } = setup();
    add("2026-10-02", 200, [goa.id]);
    add("2026-10-03", 300);
    expect(search(db, "goa").map((t) => t.amount)).toEqual([200]);
    expect(search(db, "GOA TR").map((t) => t.amount)).toEqual([200]);
  });
});

describe("listTagsWithTotals", () => {
  it("totals spend and income per tag in the display currency, biggest spend first, tags without activity last", () => {
    const { db, goa, work, usd, add } = setup();
    setSetting(db, "display_currency", "INR");
    setRate(db, "USD", "INR", 80);
    add("2026-10-02", 1000, [goa.id]);
    add("2026-10-03", 10, [goa.id], "expense", usd.id);
    add("2026-10-04", 5000, [goa.id], "income");
    add("2026-09-30", 9999, [work.id]);
    const unused = createTag(db, { name: "Zed", color: "pink" });
    const totals = listTagsWithTotals(db, {
      from: "2026-10-01",
      to: "2026-10-31",
    });
    expect(totals.map((t) => [t.tag.name, t.spent, t.earned, t.count])).toEqual(
      [
        ["Goa trip", 1800, 5000, 3],
        ["Work", 0, 0, 0],
        ["Zed", 0, 0, 0],
      ],
    );
    expect(totals[0]?.currency).toBe("INR");
    expect(unused.id).toBeDefined();
  });

  it("counts a multi-tag transaction once per tag and ignores transfers and lending", () => {
    const { db, cash, bank, goa, work, add } = setup();
    const person = createPerson(db, { name: "Asha" });
    add("2026-10-02", 700, [goa.id, work.id]);
    const transfer = createTransaction(db, {
      kind: "transfer",
      amount: 4000,
      accountId: bank.id,
      transferAccountId: cash.id,
      occurredAt: at("2026-10-02"),
    });
    const lent = createTransaction(db, {
      kind: "lent",
      amount: 9000,
      accountId: cash.id,
      personId: person.id,
      occurredAt: at("2026-10-02"),
    });
    setTransactionTags(db, transfer.id, [goa.id]);
    setTransactionTags(db, lent.id, [goa.id]);
    const totals = listTagsWithTotals(db, {
      from: "2026-10-01",
      to: "2026-10-31",
    });
    expect(totals.map((t) => [t.tag.name, t.spent, t.count])).toEqual([
      ["Goa trip", 700, 1],
      ["Work", 700, 1],
    ]);
    // The lent transaction still carries its tag for filtering.
    expect(transactionsForTag(db, goa.id)).toHaveLength(3);
  });
});

describe("CSV tags and lending", () => {
  it("exports tags semicolon-separated and the person, and imports them back with the same ids", () => {
    const { db, cash, goa, work, food } = setup();
    const asha = createPerson(db, { name: "Asha" });
    createTransaction(db, {
      kind: "expense",
      title: "Beach shack",
      amount: 1250,
      accountId: cash.id,
      categoryId: food,
      occurredAt: at("2026-10-02"),
      tagIds: [work.id, goa.id],
    });
    createTransaction(db, {
      kind: "lent",
      amount: 5000,
      accountId: cash.id,
      personId: asha.id,
      occurredAt: at("2026-10-03"),
    });
    createTransaction(db, {
      kind: "repaid_to_me",
      amount: 2000,
      accountId: cash.id,
      personId: asha.id,
      occurredAt: at("2026-10-04"),
    });
    createTransaction(db, {
      kind: "borrowed",
      amount: 700,
      accountId: cash.id,
      personId: createPerson(db, { name: "Ravi" }).id,
      occurredAt: at("2026-10-05"),
    });
    createTransaction(db, {
      kind: "repaid_by_me",
      amount: 300,
      accountId: cash.id,
      personId: createPerson(db, { name: "Meera" }).id,
      occurredAt: at("2026-10-06"),
    });

    const records = listForExport(db);
    expect(records[0]).toMatchObject({
      tags: ["Goa trip", "Work"],
      person: null,
    });
    const text = buildExportCsv(records);
    expect(text).toContain("Goa trip;Work");
    expect(text.split("\r\n")[0]).toMatch(/,id,tags,person$/);

    const target = createTestDb();
    makeAccounts(target);
    const parsed = parseNative(text);
    expect(parsed.skipped).toBe(0);
    const result = importTransactions(target, parsed.rows, {
      displayCurrency: "INR",
      defaultAccountId: null,
    });
    expect(result.imported).toBe(5);
    expect(buildExportCsv(listForExport(target))).toBe(text);
    expect(listTags(target).map((t) => t.name)).toEqual(["Goa trip", "Work"]);
    expect(
      outstandingByPerson(target).map((o) => [o.person.name, o.total]),
    ).toEqual([
      ["Asha", 3000],
      ["Ravi", -700],
      ["Meera", 300],
    ]);
  });

  it("still imports files without tags or person columns", () => {
    const parsed = parseNative(NATIVE_SAMPLE);
    expect(
      parsed.rows.every(
        (r) => (r.tags ?? []).length === 0 && r.person === null,
      ),
    ).toBe(true);
    const db = createTestDb({ seed: true });
    const result = importTransactions(db, parsed.rows, {
      displayCurrency: "USD",
      defaultAccountId: null,
    });
    expect(result.imported).toBe(4);
    expect(listTags(db)).toEqual([]);
  });

  it("skips lending rows without a person and reuses existing tags ignoring case", () => {
    const { db, goa } = setup();
    const header =
      "date,time,kind,title,memo,amount,currency,category,account,transfer_account,transfer_amount,split_index,split_count,id,tags,person";
    const csv = [
      header,
      "2026-10-02,10:00,lent,,,10.00,INR,,Cash,,,1,1,x1,,",
      "2026-10-02,10:00,lent,,,10.00,INR,,Cash,,,1,1,x2,,Asha",
      "2026-10-03,10:00,expense,Tea,,3.00,INR,Food & Drink,Cash,,,1,1,x3,goa TRIP; New ;new,",
    ].join("\n");
    const parsed = parseNative(csv);
    const result = importTransactions(db, parsed.rows, {
      displayCurrency: "INR",
      defaultAccountId: null,
    });
    expect(result).toMatchObject({ imported: 2, skipped: 1 });
    expect(listTags(db).map((t) => t.name)).toEqual([
      "Goa trip",
      "New",
      "Work",
    ]);
    expect(goa.id).toBeDefined();
    expect(splitTags(" a ;; A;b ")).toEqual(["a", "b"]);
  });
});
