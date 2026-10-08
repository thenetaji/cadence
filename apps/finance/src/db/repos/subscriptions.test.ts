/** @jest-environment node */
import { createTestDb, categoryId, makeAccounts } from "../test-helpers";
import { setRate } from "./fx";
import { createRule, setRulePaused } from "./recurring";
import { setSetting } from "./settings";
import { listSubscriptions } from "./subscriptions";

const setup = () => {
  const db = createTestDb();
  const accts = makeAccounts(db);
  const category = categoryId(db, "Subscriptions");
  const rule = (
    title: string,
    amount: number,
    over: Partial<Parameters<typeof createRule>[1]> = {},
  ) =>
    createRule(db, {
      kind: "expense",
      title,
      amount,
      accountId: accts.cash.id,
      categoryId: category,
      frequency: "monthly",
      startDate: "2026-10-01",
      ...over,
    });
  return { db, ...accts, rule };
};

describe("listSubscriptions", () => {
  it("normalises each rule to monthly and yearly cost with its next charge date", () => {
    const { db, rule } = setup();
    setSetting(db, "display_currency", "INR");
    rule("Netflix", 64900, { startDate: "2026-10-12" });
    rule("iCloud", 29900 * 12, {
      frequency: "yearly",
      startDate: "2027-01-05",
    });
    rule("Gym", 1500000, {
      frequency: "monthly",
      interval: 3,
      startDate: "2026-10-20",
    });
    rule("Paper", 2000, { frequency: "weekly", startDate: "2026-10-07" });
    const list = listSubscriptions(db);
    expect(list.currency).toBe("INR");
    expect(
      list.items.map((i) => [i.rule.title, i.monthly, i.yearly, i.nextCharge]),
    ).toEqual([
      ["Gym", 500000, 6000000, "2026-10-20"],
      ["Netflix", 64900, 778800, "2026-10-12"],
      ["iCloud", 29900, 358800, "2027-01-05"],
      ["Paper", 8667, 104000, "2026-10-07"],
    ]);
    expect(list.totals).toEqual({
      monthly: 500000 + 29900 + 64900 + 8667,
      yearly: 6000000 + 358800 + 778800 + 104000,
      count: 4,
    });
  });

  it("skips paused, ended, income and transfer rules", () => {
    const { db, bank, rule } = setup();
    const paused = rule("Paused", 100);
    setRulePaused(db, paused.id, true);
    rule("Ended", 100, {
      startDate: "2026-01-01",
      nextDue: "2026-10-01",
      endDate: "2026-09-30",
    });
    rule("Salary", 100, { kind: "income" });
    rule("Move", 100, { kind: "transfer", transferAccountId: bank.id });
    rule("Live", 100, { endDate: "2026-12-31" });
    expect(listSubscriptions(db).items.map((i) => i.rule.title)).toEqual([
      "Live",
    ]);
  });

  it("converts to the display currency for totals but keeps own-currency figures", () => {
    const { db, usd, rule } = setup();
    setSetting(db, "display_currency", "INR");
    setRate(db, "USD", "INR", 80);
    rule("Figma", 1500, { accountId: usd.id });
    rule("Hotstar", 10000);
    const list = listSubscriptions(db);
    const figma = list.items.find((i) => i.rule.title === "Figma");
    expect(figma).toMatchObject({
      monthly: 1500,
      monthlyDisplay: 120000,
      yearly: 18000,
      yearlyDisplay: 1440000,
    });
    expect(list.items[0]?.rule.title).toBe("Figma");
    expect(list.totals.monthly).toBe(130000);
  });

  it("is empty without rules", () => {
    const { db } = setup();
    expect(listSubscriptions(db)).toMatchObject({
      items: [],
      totals: { monthly: 0, yearly: 0, count: 0 },
    });
  });
});
