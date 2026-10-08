/** @jest-environment node */
import { eq } from "drizzle-orm";
import { ValidationError } from "../errors";
import { transactionSplits, transactions } from "../schema";
import { at, categoryId, createTestDb, makeAccounts } from "../test-helpers";
import { getAccountBalance, listAccountsWithBalances } from "./accounts";
import {
  createTransaction,
  deleteTransaction,
  getTransaction,
  listForPeriod,
  recent,
  restoreTransaction,
  search,
  updateTransaction,
} from "./transactions";

const setup = () => {
  const db = createTestDb();
  return {
    db,
    ...makeAccounts(db),
    food: categoryId(db, "Food & Drink"),
    groceries: categoryId(db, "Groceries"),
    transport: categoryId(db, "Transport"),
    salary: categoryId(db, "Salary"),
  };
};

const code = (fn: () => unknown): string | undefined => {
  try {
    fn();
  } catch (e) {
    return e instanceof ValidationError ? e.code : String(e);
  }
  return undefined;
};

describe("createTransaction validation", () => {
  it("rejects non-positive and non-integer amounts", () => {
    const { db, cash, food } = setup();
    const base = {
      kind: "expense",
      accountId: cash.id,
      categoryId: food,
      occurredAt: at("2026-10-01"),
    } as const;
    expect(code(() => createTransaction(db, { ...base, amount: 0 }))).toBe(
      "amount_not_positive",
    );
    expect(code(() => createTransaction(db, { ...base, amount: -5 }))).toBe(
      "amount_not_positive",
    );
    expect(code(() => createTransaction(db, { ...base, amount: 10.5 }))).toBe(
      "amount_not_integer",
    );
  });

  it("requires a category for expense and income", () => {
    const { db, cash } = setup();
    expect(
      code(() =>
        createTransaction(db, {
          kind: "expense",
          amount: 100,
          accountId: cash.id,
          occurredAt: at("2026-10-01"),
        }),
      ),
    ).toBe("category_required");
  });

  it("rejects a category of the wrong kind", () => {
    const { db, cash, salary } = setup();
    expect(
      code(() =>
        createTransaction(db, {
          kind: "expense",
          amount: 100,
          accountId: cash.id,
          categoryId: salary,
          occurredAt: at("2026-10-01"),
        }),
      ),
    ).toBe("target_kind_mismatch");
  });

  it("enforces 2-8 split lines summing to the amount", () => {
    const { db, cash, food, groceries, transport } = setup();
    const base = {
      kind: "expense",
      amount: 1000,
      accountId: cash.id,
      occurredAt: at("2026-10-01"),
    } as const;
    expect(
      code(() =>
        createTransaction(db, {
          ...base,
          splits: [{ categoryId: food, amount: 1000 }],
        }),
      ),
    ).toBe("split_count");
    expect(
      code(() =>
        createTransaction(db, {
          ...base,
          splits: [
            { categoryId: food, amount: 600 },
            { categoryId: groceries, amount: 300 },
          ],
        }),
      ),
    ).toBe("split_sum_mismatch");
    expect(
      code(() =>
        createTransaction(db, {
          ...base,
          splits: [
            { categoryId: food, amount: 1000 },
            { categoryId: groceries, amount: 0 },
          ],
        }),
      ),
    ).toBe("split_amount_not_positive");
    const nine = Array.from({ length: 9 }, (_, i) => ({
      categoryId: i % 2 ? food : transport,
      amount: i === 0 ? 1000 - 8 : 1,
    }));
    expect(code(() => createTransaction(db, { ...base, splits: nine }))).toBe(
      "split_count",
    );
    const eight = nine
      .slice(0, 8)
      .map((s, i) => ({ ...s, amount: i === 0 ? 1000 - 7 : 1 }));
    expect(
      code(() => createTransaction(db, { ...base, splits: eight })),
    ).toBeUndefined();
    expect(db.select().from(transactions).all()).toHaveLength(1);
  });

  it("validates transfers", () => {
    const { db, cash, bank, usd } = setup();
    const base = {
      kind: "transfer",
      amount: 500,
      accountId: cash.id,
      occurredAt: at("2026-10-01"),
    } as const;
    expect(code(() => createTransaction(db, base))).toBe(
      "transfer_needs_two_accounts",
    );
    expect(
      code(() =>
        createTransaction(db, { ...base, transferAccountId: cash.id }),
      ),
    ).toBe("transfer_needs_two_accounts");
    expect(
      code(() => createTransaction(db, { ...base, transferAccountId: usd.id })),
    ).toBe("transfer_amount_required");
    expect(
      code(() =>
        createTransaction(db, { ...base, transferAccountId: bank.id }),
      ),
    ).toBeUndefined();
  });

  it("writes nothing when validation fails mid-way", () => {
    const { db, cash, food } = setup();
    const failing = () =>
      createTransaction(db, {
        kind: "expense",
        amount: 100,
        accountId: cash.id,
        categoryId: food,
        occurredAt: at("2026-10-01"),
        splits: [
          { categoryId: food, amount: 50 },
          { categoryId: "missing", amount: 50 },
        ],
      });
    expect(code(failing)).toBe("category_not_found");
    expect(db.select().from(transactions).all()).toHaveLength(0);
  });
});

describe("transactions", () => {
  it("stores derived fields and defaults the title to the category name", () => {
    const { db, cash, food } = setup();
    const row = createTransaction(db, {
      kind: "expense",
      amount: 34000,
      accountId: cash.id,
      categoryId: food,
      occurredAt: at("2026-10-03", 23),
    });
    expect(row).toMatchObject({
      title: "Food & Drink",
      currency: "INR",
      dateKey: "2026-10-03",
      isSplit: false,
      transferAccountId: null,
    });
  });

  it("stores splits on a parent without a category", () => {
    const { db, cash, food, groceries } = setup();
    const row = createTransaction(db, {
      kind: "expense",
      title: "Big Basket",
      amount: 1000,
      accountId: cash.id,
      occurredAt: at("2026-10-01"),
      splits: [
        { categoryId: food, amount: 400 },
        { categoryId: groceries, amount: 600 },
      ],
    });
    expect(row.isSplit).toBe(true);
    expect(row.categoryId).toBeNull();
    const item = getTransaction(db, row.id);
    expect(item?.splits.map((s) => [s.category.name, s.amount])).toEqual([
      ["Food & Drink", 400],
      ["Groceries", 600],
    ]);
  });

  it("updates in place, replacing splits and keeping created_at", () => {
    const { db, cash, food, groceries } = setup();
    const row = createTransaction(
      db,
      {
        kind: "expense",
        amount: 1000,
        accountId: cash.id,
        occurredAt: at("2026-10-01"),
        splits: [
          { categoryId: food, amount: 400 },
          { categoryId: groceries, amount: 600 },
        ],
      },
      1000,
    );
    const updated = updateTransaction(
      db,
      row.id,
      {
        kind: "expense",
        amount: 700,
        accountId: cash.id,
        categoryId: food,
        occurredAt: at("2026-10-02"),
      },
      2000,
    );
    expect(updated).toMatchObject({
      id: row.id,
      amount: 700,
      isSplit: false,
      createdAt: 1000,
      updatedAt: 2000,
      dateKey: "2026-10-02",
    });
    expect(db.select().from(transactionSplits).all()).toHaveLength(0);
    expect(
      code(() =>
        updateTransaction(db, "nope", {
          kind: "expense",
          amount: 1,
          accountId: cash.id,
          categoryId: food,
          occurredAt: 1,
        }),
      ),
    ).toBe("not_found");
  });

  it("delete returns a snapshot and restore re-inserts it identically", () => {
    const { db, cash, food, groceries } = setup();
    const row = createTransaction(db, {
      kind: "expense",
      title: "Weekly shop",
      memo: "bulk",
      amount: 1000,
      accountId: cash.id,
      occurredAt: at("2026-10-01"),
      splits: [
        { categoryId: food, amount: 400 },
        { categoryId: groceries, amount: 600 },
      ],
    });
    const before = getTransaction(db, row.id);
    const snapshot = deleteTransaction(db, row.id);
    expect(snapshot?.splits).toHaveLength(2);
    expect(getTransaction(db, row.id)).toBeUndefined();
    expect(db.select().from(transactionSplits).all()).toHaveLength(0);
    if (!snapshot) throw new Error("expected snapshot");
    restoreTransaction(db, snapshot);
    expect(getTransaction(db, row.id)).toEqual(before);
    expect(deleteTransaction(db, "missing")).toBeUndefined();
  });

  it("lists a period newest first with joined display info", () => {
    const { db, cash, bank, food, groceries } = setup();
    createTransaction(db, {
      kind: "expense",
      amount: 100,
      accountId: cash.id,
      categoryId: food,
      occurredAt: at("2026-10-01", 8),
    });
    createTransaction(db, {
      kind: "expense",
      amount: 200,
      accountId: bank.id,
      categoryId: groceries,
      occurredAt: at("2026-10-01", 18),
    });
    createTransaction(db, {
      kind: "transfer",
      amount: 300,
      accountId: bank.id,
      transferAccountId: cash.id,
      occurredAt: at("2026-10-02"),
    });
    createTransaction(db, {
      kind: "expense",
      amount: 400,
      accountId: cash.id,
      categoryId: food,
      occurredAt: at("2026-11-01"),
    });
    const rows = listForPeriod(db, { from: "2026-10-01", to: "2026-10-31" });
    expect(rows.map((r) => r.amount)).toEqual([300, 200, 100]);
    expect(rows[0]?.transferAccount?.name).toBe("Cash");
    expect(rows[0]?.category).toBeNull();
    expect(rows[1]).toMatchObject({
      account: { name: "HDFC", currency: "INR" },
      category: { name: "Groceries", icon: "cart.fill", color: "green" },
    });
  });

  it("filters by kind, account (either side of a transfer) and category (including split lines)", () => {
    const { db, cash, bank, food, groceries } = setup();
    createTransaction(db, {
      kind: "expense",
      amount: 100,
      accountId: cash.id,
      categoryId: food,
      occurredAt: at("2026-10-01"),
    });
    createTransaction(db, {
      kind: "expense",
      amount: 200,
      accountId: bank.id,
      occurredAt: at("2026-10-02"),
      splits: [
        { categoryId: food, amount: 150 },
        { categoryId: groceries, amount: 50 },
      ],
    });
    createTransaction(db, {
      kind: "transfer",
      amount: 300,
      accountId: bank.id,
      transferAccountId: cash.id,
      occurredAt: at("2026-10-03"),
    });
    const range = { from: "2026-10-01", to: "2026-10-31" };
    expect(listForPeriod(db, { ...range, kinds: ["transfer"] })).toHaveLength(
      1,
    );
    expect(listForPeriod(db, { ...range, accountId: cash.id })).toHaveLength(2);
    expect(
      listForPeriod(db, { ...range, categoryId: groceries }).map(
        (r) => r.amount,
      ),
    ).toEqual([200]);
    expect(listForPeriod(db, { ...range, categoryId: food })).toHaveLength(2);
    expect(
      listForPeriod(db, {
        ...range,
        categoryId: food,
        accountId: bank.id,
        kinds: ["expense"],
      }),
    ).toHaveLength(1);
  });

  it("returns the most recent n", () => {
    const { db, cash, food } = setup();
    for (let d = 1; d <= 5; d++)
      createTransaction(db, {
        kind: "expense",
        amount: d * 100,
        accountId: cash.id,
        categoryId: food,
        occurredAt: at(`2026-10-0${d}`),
      });
    expect(recent(db, 3).map((r) => r.amount)).toEqual([500, 400, 300]);
  });
});

describe("search", () => {
  const seed = () => {
    const s = setup();
    const add = (
      title: string,
      amount: number,
      memo = "",
      accountId = s.cash.id,
    ) =>
      createTransaction(s.db, {
        kind: "expense",
        title,
        memo,
        amount,
        accountId,
        categoryId: s.food,
        occurredAt: at("2026-10-01"),
      });
    add("Swiggy dinner", 34000);
    add("Zomato", 34100, "team lunch");
    add("Cab", 35000);
    add("Order 340", 99900);
    add("Rent", 3400000);
    add("100% juice", 5000);
    return s;
  };

  it("matches title and memo case-insensitively", () => {
    const { db } = seed();
    expect(search(db, "swiggy").map((r) => r.title)).toEqual(["Swiggy dinner"]);
    expect(search(db, "TEAM").map((r) => r.title)).toEqual(["Zomato"]);
    expect(search(db, "  ")).toEqual([]);
  });

  it("matches amounts within 0.5% as well as digits in the title", () => {
    const { db } = seed();
    expect(
      search(db, "340")
        .map((r) => r.title)
        .sort(),
    ).toEqual(["Order 340", "Swiggy dinner", "Zomato"]);
    expect(search(db, "350").map((r) => r.title)).toEqual(["Cab"]);
  });

  it("uses currency minor digits (JPY has none)", () => {
    const { db, usd, food } = seed();
    const yen = createTransaction(db, {
      kind: "expense",
      amount: 100000,
      accountId: usd.id,
      categoryId: food,
      occurredAt: at("2026-10-02"),
      title: "x",
    });
    expect(search(db, "1000").map((r) => r.id)).toContain(yen.id);
  });

  it("escapes LIKE wildcards and caps results at 200", () => {
    const { db, cash, food } = seed();
    expect(search(db, "100%").map((r) => r.title)).toEqual(["100% juice"]);
    expect(search(db, "_")).toEqual([]);
    for (let i = 0; i < 210; i++)
      createTransaction(db, {
        kind: "expense",
        title: "bulk",
        amount: 10 + i,
        accountId: cash.id,
        categoryId: food,
        occurredAt: at("2026-10-02"),
      });
    expect(search(db, "bulk")).toHaveLength(200);
  });
});

describe("balances and transfers", () => {
  it("computes opening + income - expense", () => {
    const { db, cash, food, salary } = setup();
    createTransaction(db, {
      kind: "income",
      amount: 50000,
      accountId: cash.id,
      categoryId: salary,
      occurredAt: at("2026-10-01"),
    });
    createTransaction(db, {
      kind: "expense",
      amount: 12000,
      accountId: cash.id,
      categoryId: food,
      occurredAt: at("2026-10-02"),
    });
    expect(getAccountBalance(db, cash.id)).toBe(100000 + 50000 - 12000);
  });

  it("moves money between same-currency accounts without touching spend", () => {
    const { db, cash, bank } = setup();
    const t = createTransaction(db, {
      kind: "transfer",
      amount: 20000,
      accountId: bank.id,
      transferAccountId: cash.id,
      occurredAt: at("2026-10-01"),
    });
    expect(t).toMatchObject({ transferAmount: 20000, transferCurrency: "INR" });
    expect(getAccountBalance(db, bank.id)).toBe(5000000 - 20000);
    expect(getAccountBalance(db, cash.id)).toBe(100000 + 20000);
  });

  it("uses the stored amounts for cross-currency transfers", () => {
    const { db, bank, usd } = setup();
    createTransaction(db, {
      kind: "transfer",
      amount: 832000,
      transferAmount: 10000,
      accountId: bank.id,
      transferAccountId: usd.id,
      occurredAt: at("2026-10-01"),
    });
    createTransaction(db, {
      kind: "transfer",
      amount: 5000,
      transferAmount: 400000,
      accountId: usd.id,
      transferAccountId: bank.id,
      occurredAt: at("2026-10-02"),
    });
    const balances = new Map(
      listAccountsWithBalances(db).map((a) => [a.name, a.balance]),
    );
    expect(balances.get("HDFC")).toBe(5000000 - 832000 + 400000);
    expect(balances.get("Wise USD")).toBe(100000 + 10000 - 5000);
  });

  it("reflects deletes and updates", () => {
    const { db, cash, bank } = setup();
    const t = createTransaction(db, {
      kind: "transfer",
      amount: 20000,
      accountId: bank.id,
      transferAccountId: cash.id,
      occurredAt: at("2026-10-01"),
    });
    updateTransaction(db, t.id, {
      kind: "transfer",
      amount: 30000,
      accountId: bank.id,
      transferAccountId: cash.id,
      occurredAt: at("2026-10-01"),
    });
    expect(getAccountBalance(db, cash.id)).toBe(130000);
    deleteTransaction(db, t.id);
    expect(getAccountBalance(db, cash.id)).toBe(100000);
    expect(
      db.select().from(transactions).where(eq(transactions.id, t.id)).all(),
    ).toHaveLength(0);
  });
});
