/** @jest-environment node */
import { count, eq } from "drizzle-orm";
import { categoryTotals, groupTopCategories } from "@/lib/insights";
import { periodFor, toDateKey } from "@studio/dates";
import { makeRateLookup } from "@studio/money";
import { seedDemoData } from "./dev-seed";
import { listAccountsWithBalances } from "./repos/accounts";
import { listRates } from "./repos/fx";
import { listRules } from "./repos/recurring";
import { spendLines } from "./repos/reports";
import { getSetting } from "./repos/settings";
import {
  accounts,
  budgets,
  categories,
  transactionSplits,
  transactions,
} from "./schema";
import { createTestDb } from "./test-helpers";

const NOW = new Date(2026, 9, 5, 14, 0).getTime();

const snapshot = (db: ReturnType<typeof createTestDb>) => ({
  tx: db.select({ n: count() }).from(transactions).get()?.n,
  balances: listAccountsWithBalances(db).map((a) => [a.name, a.balance]),
});

describe("seedDemoData", () => {
  it("builds six months of coherent data and is idempotent", () => {
    const db = createTestDb();
    seedDemoData(db, NOW);
    const first = snapshot(db);
    seedDemoData(db, NOW);
    expect(snapshot(db)).toEqual(first);

    expect(first.tx).toBeGreaterThan(150);
    expect(db.select({ n: count() }).from(accounts).get()?.n).toBe(4);
    expect(db.select({ n: count() }).from(budgets).get()?.n).toBe(5);
    expect(db.select({ n: count() }).from(categories).get()?.n).toBe(19);
    expect(getSetting(db, "display_currency")).toBe("INR");
    expect(listRates(db)).toHaveLength(1);
    expect(
      listRules(db)
        .map((r) => r.title)
        .sort(),
    ).toEqual([
      "Cash top-up",
      "Cloud storage",
      "Gym",
      "House help",
      "Netflix",
      "Rent",
      "Spotify",
    ]);
  });

  it("keeps data inside the window with valid splits and transfers", () => {
    const db = createTestDb();
    seedDemoData(db, NOW);
    const dates = db
      .select({ d: transactions.dateKey })
      .from(transactions)
      .all()
      .map((r) => r.d)
      .sort();
    expect((dates[dates.length - 1] ?? "") <= toDateKey(NOW)).toBe(true);
    expect((dates[0] ?? "") >= "2026-05-01").toBe(true);

    const splitParents = db
      .select()
      .from(transactions)
      .where(eq(transactions.isSplit, true))
      .all();
    expect(splitParents.length).toBeGreaterThanOrEqual(3);
    for (const parent of splitParents) {
      const lines = db
        .select()
        .from(transactionSplits)
        .where(eq(transactionSplits.transactionId, parent.id))
        .all();
      expect(lines.reduce((s, l) => s + l.amount, 0)).toBe(parent.amount);
    }
    const transfers = db
      .select()
      .from(transactions)
      .where(eq(transactions.kind, "transfer"))
      .all();
    expect(
      transfers.some(
        (t) => t.transferCurrency === "USD" || t.currency === "USD",
      ),
    ).toBe(true);
    expect(
      transfers.filter((t) => t.title === "Cash top-up").length,
    ).toBeGreaterThanOrEqual(5);
  });

  it("feeds insights with a sensible top-8 breakdown", () => {
    const db = createTestDb();
    seedDemoData(db, NOW);
    const period = periodFor("month", "2026-09-15");
    const lines = spendLines(db, period);
    const ctx = {
      displayCurrency: "INR",
      rates: makeRateLookup(listRates(db)),
    };
    const totals = categoryTotals(lines, "expense", period, ctx);
    const grouped = groupTopCategories(totals, 8);
    expect(totals.length).toBeGreaterThan(5);
    expect(grouped[0]?.amount).toBeGreaterThanOrEqual(grouped[1]?.amount ?? 0);
    expect(
      lines.every((l) => l.kind === "expense" || l.kind === "income"),
    ).toBe(true);
  });
});
