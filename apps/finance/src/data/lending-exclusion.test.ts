/** @jest-environment node */
import {
  createBudget,
  budgetSpent,
  getBudget,
  listBudgetProgress,
} from "@/db/repos/budgets";
import { dailyTotals } from "@/db/repos/calendar";
import { detailedLines } from "@/db/repos/insight-lines";
import { createPerson } from "@/db/repos/people";
import { spendLines } from "@/db/repos/reports";
import { createTransaction } from "@/db/repos/transactions";
import { at, categoryId, createTestDb, makeAccounts } from "@/db/test-helpers";
import { periodFor } from "@studio/dates";
import { LENDING_KINDS } from "@/lib/ledger";
import { readCategoryTrend } from "./hooks/categoryTrend";
import { readHomeSpend } from "./hooks/homeSpend";
import { readInsights } from "./hooks/insights";
import { readInsightsExtras } from "./hooks/insightsExtras";
import { readPeriodSummary } from "./hooks/summary";

/**
 * Lending moves money between accounts and people but is neither spending nor earning. Every
 * aggregation below is run against a month containing only real expense/income plus one of each
 * lending kind and must produce exactly the figures it would without the lending rows.
 */
describe("lending is excluded from every spend aggregation", () => {
  const setup = () => {
    const db = createTestDb();
    const { cash, bank } = makeAccounts(db);
    const person = createPerson(db, { name: "Asha" });
    const food = categoryId(db, "Food & Drink");
    createTransaction(db, {
      kind: "expense",
      amount: 10000,
      accountId: cash.id,
      categoryId: food,
      occurredAt: at("2026-10-05"),
      title: "Lunch",
    });
    createTransaction(db, {
      kind: "income",
      amount: 50000,
      accountId: bank.id,
      categoryId: categoryId(db, "Salary"),
      occurredAt: at("2026-10-01"),
    });
    for (const kind of LENDING_KINDS) {
      createTransaction(db, {
        kind,
        amount: 777700,
        accountId: cash.id,
        personId: person.id,
        occurredAt: at("2026-10-05"),
        title: "Lunch",
      });
    }
    return { db, cash, bank, food };
  };
  const october = periodFor("month", "2026-10-15");

  it("keeps spend/earned summaries, insights and category trends to real expense and income", () => {
    const { db, food } = setup();
    expect(readPeriodSummary(db, october)).toEqual({
      currency: "USD",
      spent: 10000,
      earned: 50000,
    });
    const expense = readInsights(db, october, "expense");
    expect(expense.total).toBe(10000);
    expect(expense.categories.map((c) => c.amount)).toEqual([10000]);
    expect(expense.series.reduce((sum, p) => sum + p.amount, 0)).toBe(10000);
    expect(readInsights(db, october, "income").total).toBe(50000);
    expect(
      readCategoryTrend(db, food, october, "expense").points.at(-1)?.amount,
    ).toBe(10000);
  });

  it("keeps Home spend, per-day stats and the extras to real expense and income", () => {
    const { db } = setup();
    const home = readHomeSpend(db, october, "2026-10-31");
    expect(home.spent).toBe(10000);
    expect(home.earned).toBe(50000);
    const extras = readInsightsExtras(
      db,
      october,
      "expense",
      { weekStart: 1, monthStart: 1 },
      "2026-10-31",
    );
    expect(extras.spent).toBe(10000);
    expect(extras.earned).toBe(50000);
    expect(extras.transactionCount).toBe(1);
    expect(extras.biggest?.amount).toBe(10000);
    expect(extras.merchants.map((m) => [m.title, m.amount, m.count])).toEqual([
      ["Lunch", 10000, 1],
    ]);
    expect(extras.weekdays.reduce((sum, d) => sum + d.total, 0)).toBe(10000);
    expect(extras.accounts.reduce((sum, a) => sum + a.amount, 0)).toBe(10000);
    expect(extras.monthly.at(-1)).toMatchObject({
      spent: 10000,
      income: 50000,
    });
  });

  it("keeps the calendar heatmap to real spend", () => {
    const { db } = setup();
    const month = dailyTotals(db, "2026-10", "expense");
    expect(month.total).toBe(10000);
    expect(month.max).toBe(10000);
    expect(month.days.filter((d) => d.amount > 0)).toEqual([
      { dateKey: "2026-10-05", amount: 10000 },
    ]);
  });

  it("keeps budget spent and progress to real expenses, with and without category scope", () => {
    const { db, food } = setup();
    const all = createBudget(db, {
      amount: 100000,
      currency: "USD",
      period: "monthly",
      startAnchor: 1,
      scope: "all",
    });
    const scoped = createBudget(db, {
      amount: 100000,
      currency: "USD",
      period: "weekly",
      startAnchor: 1,
      scope: "categories",
      categoryIds: [food],
    });
    expect(budgetSpent(db, getBudget(db, all.id)!, october)).toBe(10000);
    const progress = listBudgetProgress(db, "2026-10-05");
    expect(progress.find((p) => p.budget.id === all.id)?.spent).toBe(10000);
    expect(progress.find((p) => p.budget.id === scoped.id)?.spent).toBe(10000);
  });

  it("never feeds lending rows into the flat line builders", () => {
    const { db } = setup();
    const range = { from: "2026-10-01", to: "2026-10-31" };
    expect(
      spendLines(db, range)
        .map((l) => l.kind)
        .sort(),
    ).toEqual(["expense", "income"]);
    expect(
      detailedLines(db, range)
        .map((l) => l.kind)
        .sort(),
    ).toEqual(["expense", "income"]);
  });
});
