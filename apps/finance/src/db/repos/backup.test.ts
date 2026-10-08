/** @jest-environment node */
import { seedDemoData } from "../dev-seed";
import { at, categoryId, createTestDb, makeAccounts } from "../test-helpers";
import { accounts, transactions } from "../schema";
import { addAttachment } from "./attachments";
import {
  BACKUP_VERSION,
  BackupError,
  DEVICE_SETTING_KEYS,
  SCHEMA_VERSION,
  exportBackup,
  localModifiedAt,
  restoreBackup,
  serializeBackup,
  validateBackup,
} from "./backup";
import { createBudget } from "./budgets";
import { setRate } from "./fx";
import { createPerson, outstandingByPerson } from "./people";
import { getAllSettings, getSetting, setSetting } from "./settings";
import { createTag, listTags } from "./tags";
import { createTransaction } from "./transactions";

const NOW = Date.UTC(2026, 9, 6, 12);

function demoWithExtras() {
  const db = createTestDb();
  seedDemoData(db, NOW);
  const [first] = db.select().from(accounts).all();
  if (!first) throw new Error("demo accounts expected");
  const goa = createTag(db, { name: "Goa", color: "cyan" });
  const asha = createPerson(db, { name: "Asha" });
  const tx = createTransaction(db, {
    kind: "expense",
    title: "Shack",
    amount: 4500,
    accountId: first.id,
    categoryId: categoryId(db, "Food & Drink"),
    occurredAt: at("2026-10-02"),
    tagIds: [goa.id],
  });
  addAttachment(db, {
    transactionId: tx.id,
    uri: "file:///attachments/a.jpg",
    width: 800,
    height: 600,
  });
  createTransaction(db, {
    kind: "lent",
    amount: 2500,
    accountId: first.id,
    personId: asha.id,
    occurredAt: at("2026-10-03"),
  });
  createBudget(db, {
    amount: 900000,
    currency: "INR",
    period: "yearly",
    startAnchor: 1,
    scope: "all",
  });
  setRate(db, "USD", "INR", 83.25);
  setSetting(db, "display_currency", "INR");
  return db;
}

describe("exportBackup", () => {
  it("writes a versioned document with every table", () => {
    const db = demoWithExtras();
    const backup = exportBackup(db, { now: NOW, appVersion: "1.2.3" });
    expect(backup).toMatchObject({
      format: "farthing-backup",
      version: BACKUP_VERSION,
      schemaVersion: SCHEMA_VERSION,
      appVersion: "1.2.3",
      exportedAt: NOW,
    });
    expect(Object.keys(backup.tables).sort()).toEqual(
      [
        "accounts",
        "attachments",
        "budget_categories",
        "budgets",
        "categories",
        "fx_rates",
        "people",
        "recurring_rules",
        "settings",
        "tags",
        "title_memory",
        "transaction_splits",
        "transaction_tags",
        "transactions",
      ].sort(),
    );
    expect(backup.tables.transaction_tags).toHaveLength(1);
    expect(backup.tables.attachments).toHaveLength(1);
    expect(backup.tables.people).toHaveLength(1);
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(2);
  });
});

describe("restoreBackup", () => {
  it("round-trips demo data into an empty database, byte-equal apart from timestamps", () => {
    const source = demoWithExtras();
    const first = serializeBackup(
      exportBackup(source, { now: NOW, appVersion: "1.0.0" }),
    );

    const target = createTestDb({ seed: false });
    const summary = restoreBackup(target, first);
    expect(summary.transactions).toBeGreaterThan(100);

    const second = serializeBackup(
      exportBackup(target, { now: NOW + 5000, appVersion: "1.0.0" }),
    );
    const strip = (json: string) =>
      json.replace(/"exportedAt":\d+/, '"exportedAt":0');
    expect(strip(second)).toBe(strip(first));
    expect(listTags(target).map((t) => t.name)).toEqual(["Goa"]);
    expect(outstandingByPerson(target)[0]?.total).toBe(2500);
  });

  it("replaces existing data and keeps device settings", () => {
    const source = demoWithExtras();
    setSetting(source, "theme", "light");
    setSetting(source, "icon_style", "solar");
    setSetting(source, "hide_amounts", true);
    setSetting(source, "week_start", 7);
    const json = serializeBackup(exportBackup(source, { now: NOW }));

    const target = createTestDb();
    const { cash } = makeAccounts(target);
    createTransaction(target, {
      kind: "expense",
      amount: 1,
      accountId: cash.id,
      categoryId: categoryId(target, "Other"),
      occurredAt: at("2026-10-01"),
    });
    setSetting(target, "theme", "dark");
    setSetting(target, "icon_style", "lucide");
    setSetting(target, "icon_background", "tonal");
    setSetting(target, "last_backup_at", 123);
    restoreBackup(target, json);

    expect(getSetting(target, "theme")).toBe("dark");
    expect(getSetting(target, "icon_style")).toBe("lucide");
    expect(getSetting(target, "icon_background")).toBe("tonal");
    expect(getSetting(target, "hide_amounts")).toBe(false);
    expect(getSetting(target, "last_backup_at")).toBe(123);
    // Non-device settings come from the backup.
    expect(getSetting(target, "week_start")).toBe(7);
    expect(getSetting(target, "display_currency")).toBe("INR");
    expect(
      target
        .select()
        .from(accounts)
        .all()
        .some((a) => a.id === cash.id),
    ).toBe(false);
    expect(DEVICE_SETTING_KEYS).toContain("theme");
  });

  it("is atomic: a failing restore leaves the database untouched", () => {
    const source = demoWithExtras();
    const backup = exportBackup(source, { now: NOW });
    const bad = JSON.parse(serializeBackup(backup)) as typeof backup;
    // A transaction pointing at an account that is not in the file violates a foreign key.
    bad.tables.transactions![0]!.accountId = "ghost";

    const target = createTestDb();
    const { cash } = makeAccounts(target);
    const before = serializeBackup(exportBackup(target, { now: 1 }));
    expect(() => restoreBackup(target, bad)).toThrow();
    expect(serializeBackup(exportBackup(target, { now: 1 }))).toBe(before);
    expect(
      target
        .select()
        .from(accounts)
        .all()
        .map((a) => a.id),
    ).toContain(cash.id);
    expect(target.select().from(transactions).all()).toHaveLength(0);
  });

  it("rejects invalid documents with a typed error before touching data", () => {
    const target = createTestDb();
    expect(() => restoreBackup(target, "nope")).toThrow(BackupError);
    try {
      restoreBackup(target, "{}");
    } catch (e) {
      expect((e as BackupError).code).toBe("not_a_backup");
    }
    expect(getAllSettings(target).schema_seeded).toBe(true);
  });

  it("treats tables missing from an older backup as empty", () => {
    const source = demoWithExtras();
    const backup = exportBackup(source, { now: NOW });
    const old = JSON.parse(serializeBackup(backup)) as typeof backup;
    old.schemaVersion = 1;
    for (const key of ["people", "tags", "transaction_tags", "attachments"])
      delete old.tables[key];
    for (const row of old.tables.transactions ?? []) delete row.personId;
    old.tables.transactions = (old.tables.transactions ?? []).filter(
      (t) => t.kind !== "lent",
    );
    const target = createTestDb({ seed: false });
    restoreBackup(target, old);
    expect(listTags(target)).toEqual([]);
    expect(target.select().from(transactions).all().length).toBe(
      old.tables.transactions.length,
    );
  });
});

describe("validateBackup", () => {
  const valid = () =>
    JSON.parse(
      serializeBackup(exportBackup(createTestDb(), { now: NOW })),
    ) as ReturnType<typeof exportBackup>;
  const reason = (json: unknown) => {
    const result = validateBackup(json);
    return result.ok ? "ok" : result.error;
  };

  it("accepts a good document as text or object and summarises it", () => {
    const doc = valid();
    const fromText = validateBackup(JSON.stringify(doc));
    expect(fromText.ok).toBe(true);
    if (fromText.ok)
      expect(fromText.summary).toMatchObject({
        exportedAt: NOW,
        transactions: 0,
        categories: 19,
        schemaVersion: SCHEMA_VERSION,
      });
    expect(reason(doc)).toBe("ok");
  });

  it("rejects garbage, other documents, future versions and missing core tables", () => {
    expect(reason("{oops")).toBe("not_json");
    expect(reason(42)).toBe("not_a_backup");
    expect(reason(null)).toBe("not_a_backup");
    expect(reason({ format: "something-else", tables: {} })).toBe(
      "not_a_backup",
    );
    expect(reason({ ...valid(), version: 99 })).toBe("unsupported_version");
    expect(reason({ ...valid(), schemaVersion: SCHEMA_VERSION + 1 })).toBe(
      "newer_schema",
    );
    expect(reason({ ...valid(), exportedAt: "yesterday" })).toBe(
      "not_a_backup",
    );
    const noTx = valid();
    delete noTx.tables.transactions;
    expect(reason(noTx)).toBe("missing_table");
    const notList = valid() as unknown as { tables: Record<string, unknown> };
    notList.tables.accounts = {};
    expect(reason(notList)).toBe("bad_table");
  });

  it("rejects rows with missing or mistyped columns", () => {
    const db = demoWithExtras();
    const doc = exportBackup(db, { now: NOW });
    const copy = () => JSON.parse(serializeBackup(doc)) as typeof doc;
    const wrongType = copy();
    wrongType.tables.transactions![0]!.amount = "12" as unknown as number;
    expect(reason(wrongType)).toBe("bad_row");
    const missing = copy();
    delete missing.tables.accounts![0]!.name;
    expect(reason(missing)).toBe("bad_row");
    const nullRequired = copy();
    nullRequired.tables.transactions![0]!.occurredAt = null;
    expect(reason(nullRequired)).toBe("bad_row");
    const notObject = copy();
    notObject.tables.categories = [1] as never;
    expect(reason(notObject)).toBe("bad_row");
  });
});

describe("localModifiedAt", () => {
  it("is the newest write across user tables, 0 when empty", () => {
    const db = createTestDb();
    expect(localModifiedAt(db)).toBe(0);
    const { cash } = makeAccounts(db);
    createTransaction(
      db,
      {
        kind: "expense",
        amount: 1,
        accountId: cash.id,
        categoryId: categoryId(db, "Other"),
        occurredAt: at("2026-10-01"),
      },
      5_000_000_000_000,
    );
    expect(localModifiedAt(db)).toBe(5_000_000_000_000);
  });
});
