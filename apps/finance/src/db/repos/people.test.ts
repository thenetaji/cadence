/** @jest-environment node */
import { ValidationError } from "../errors";
import { titleMemory } from "../schema";
import { at, categoryId, createTestDb, makeAccounts } from "../test-helpers";
import { getAccountBalance, listAccountsWithBalances } from "./accounts";
import { setRate } from "./fx";
import {
  createPerson,
  deletePerson,
  findOrCreatePerson,
  listPeople,
  outstandingByPerson,
  outstandingTotals,
  personHistory,
  settle,
  updatePerson,
} from "./people";
import { setSetting } from "./settings";
import {
  createTransaction,
  deleteTransaction,
  getTransaction,
  restoreTransaction,
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
  const asha = createPerson(db, { name: "Asha" });
  const ravi = createPerson(db, { name: "Ravi" });
  return { db, ...accts, asha, ravi };
};

describe("people", () => {
  it("creates, renames, finds and lists case-insensitively without duplicates", () => {
    const { db, asha } = setup();
    expect(code(() => createPerson(db, { name: " asha " }))).toBe(
      "duplicate_name",
    );
    expect(code(() => createPerson(db, { name: "   " }))).toBe("invalid_input");
    expect(findOrCreatePerson(db, "ASHA").id).toBe(asha.id);
    updatePerson(db, asha.id, { name: "Asha K" });
    expect(listPeople(db).map((p) => p.name)).toEqual(["Asha K", "Ravi"]);
    expect(code(() => updatePerson(db, "nope", { name: "X" }))).toBe(
      "person_not_found",
    );
    expect(code(() => updatePerson(db, asha.id, { name: "ravi" }))).toBe(
      "duplicate_name",
    );
  });

  it("refuses to delete a person with history, and deletes a clean one", () => {
    const { db, cash, asha, ravi } = setup();
    createTransaction(db, {
      kind: "lent",
      amount: 100,
      accountId: cash.id,
      personId: asha.id,
      occurredAt: at("2026-10-01"),
    });
    expect(code(() => deletePerson(db, asha.id))).toBe("in_use");
    deletePerson(db, ravi.id);
    expect(listPeople(db).map((p) => p.name)).toEqual(["Asha"]);
  });
});

describe("lending transactions", () => {
  it("requires an existing person, forbids splits and ignores category and person on other kinds", () => {
    const { db, cash, asha } = setup();
    const base = {
      amount: 500,
      accountId: cash.id,
      occurredAt: at("2026-10-01"),
    } as const;
    expect(code(() => createTransaction(db, { ...base, kind: "lent" }))).toBe(
      "person_required",
    );
    expect(
      code(() =>
        createTransaction(db, { ...base, kind: "lent", personId: "ghost" }),
      ),
    ).toBe("person_not_found");
    expect(
      code(() =>
        createTransaction(db, {
          ...base,
          kind: "lent",
          personId: asha.id,
          splits: [
            { categoryId: categoryId(db, "Groceries"), amount: 200 },
            { categoryId: categoryId(db, "Other"), amount: 300 },
          ],
        }),
      ),
    ).toBe("invalid_input");
    const lent = createTransaction(db, {
      ...base,
      kind: "lent",
      personId: asha.id,
      categoryId: categoryId(db, "Groceries"),
    });
    expect(lent).toMatchObject({
      kind: "lent",
      categoryId: null,
      personId: asha.id,
      title: "Asha",
      isSplit: false,
    });
    const plain = createTransaction(db, {
      ...base,
      kind: "expense",
      categoryId: categoryId(db, "Groceries"),
      personId: asha.id,
    });
    expect(plain.personId).toBeNull();
    expect(getTransaction(db, lent.id)?.person).toEqual({
      id: asha.id,
      name: "Asha",
    });
  });

  it("keeps lending out of title memory suggestions", () => {
    const { db, cash, asha } = setup();
    createTransaction(db, {
      kind: "lent",
      title: "Dinner share",
      amount: 500,
      accountId: cash.id,
      personId: asha.id,
      occurredAt: at("2026-10-01"),
    });
    expect(db.select().from(titleMemory).all()).toHaveLength(0);
  });

  it("moves account balances in the right direction for every kind", () => {
    const { db, cash, asha } = setup();
    const add = (
      kind: "lent" | "borrowed" | "repaid_to_me" | "repaid_by_me",
      amount: number,
    ) =>
      createTransaction(db, {
        kind,
        amount,
        accountId: cash.id,
        personId: asha.id,
        occurredAt: at("2026-10-01"),
      });
    expect(getAccountBalance(db, cash.id)).toBe(100000);
    add("lent", 1000);
    expect(getAccountBalance(db, cash.id)).toBe(99000);
    add("borrowed", 5000);
    expect(getAccountBalance(db, cash.id)).toBe(104000);
    add("repaid_to_me", 200);
    expect(getAccountBalance(db, cash.id)).toBe(104200);
    add("repaid_by_me", 700);
    expect(getAccountBalance(db, cash.id)).toBe(103500);
    expect(
      listAccountsWithBalances(db).find((a) => a.id === cash.id)?.balance,
    ).toBe(103500);
  });

  it("can be edited and undone like any transaction", () => {
    const { db, cash, asha, ravi } = setup();
    const row = createTransaction(db, {
      kind: "lent",
      amount: 1000,
      accountId: cash.id,
      personId: asha.id,
      occurredAt: at("2026-10-01"),
    });
    updateTransaction(db, row.id, {
      kind: "lent",
      amount: 400,
      accountId: cash.id,
      personId: ravi.id,
      occurredAt: at("2026-10-01"),
    });
    expect(
      outstandingByPerson(db).map((o) => [o.person.name, o.total]),
    ).toEqual([["Ravi", 400]]);
    const snap = deleteTransaction(db, row.id);
    expect(outstandingByPerson(db)).toEqual([]);
    if (!snap) throw new Error("snapshot expected");
    restoreTransaction(db, snap);
    expect(outstandingByPerson(db).map((o) => o.total)).toEqual([400]);
  });
});

describe("outstandingByPerson", () => {
  it("nets lent, borrowed and repayments per person (positive = they owe me)", () => {
    const { db, cash, asha, ravi } = setup();
    const add = (
      personId: string,
      kind: "lent" | "borrowed" | "repaid_to_me" | "repaid_by_me",
      amount: number,
      day: string,
    ) =>
      createTransaction(db, {
        kind,
        amount,
        accountId: cash.id,
        personId,
        occurredAt: at(day),
      });
    add(asha.id, "lent", 5000, "2026-10-01");
    add(asha.id, "repaid_to_me", 1500, "2026-10-05");
    add(ravi.id, "borrowed", 3000, "2026-10-02");
    add(ravi.id, "repaid_by_me", 1000, "2026-10-06");
    const out = outstandingByPerson(db);
    expect(out.map((o) => [o.person.name, o.total, o.balances])).toEqual([
      ["Asha", 3500, [{ currency: "INR", amount: 3500 }]],
      ["Ravi", -2000, [{ currency: "INR", amount: -2000 }]],
    ]);
    expect(outstandingTotals(db)).toEqual({
      currency: "USD",
      owedToMe: 3500,
      iOwe: 2000,
    });
  });

  it("hides settled people unless asked, and keeps currencies apart then converts the total", () => {
    const { db, cash, usd, asha, ravi } = setup();
    setSetting(db, "display_currency", "INR");
    setRate(db, "USD", "INR", 80);
    createTransaction(db, {
      kind: "lent",
      amount: 1000,
      accountId: cash.id,
      personId: asha.id,
      occurredAt: at("2026-10-01"),
    });
    createTransaction(db, {
      kind: "lent",
      amount: 10,
      accountId: usd.id,
      personId: asha.id,
      occurredAt: at("2026-10-02"),
    });
    createTransaction(db, {
      kind: "lent",
      amount: 100,
      accountId: cash.id,
      personId: ravi.id,
      occurredAt: at("2026-10-03"),
    });
    createTransaction(db, {
      kind: "repaid_to_me",
      amount: 100,
      accountId: cash.id,
      personId: ravi.id,
      occurredAt: at("2026-10-04"),
    });
    const out = outstandingByPerson(db);
    expect(out).toHaveLength(1);
    expect(out[0]?.balances).toEqual([
      { currency: "INR", amount: 1000 },
      { currency: "USD", amount: 10 },
    ]);
    expect(out[0]?.total).toBe(1000 + 800);
    expect(out[0]?.lastActivityAt).toBe(at("2026-10-02"));
    expect(
      outstandingByPerson(db, { includeSettled: true })
        .map((o) => o.person.name)
        .sort(),
    ).toEqual(["Asha", "Ravi"]);
  });
});

describe("personHistory", () => {
  it("lists entries newest first with signed deltas and running balance per currency", () => {
    const { db, cash, asha } = setup();
    const add = (
      kind: "lent" | "repaid_to_me" | "borrowed",
      amount: number,
      day: string,
    ) =>
      createTransaction(db, {
        kind,
        amount,
        accountId: cash.id,
        personId: asha.id,
        occurredAt: at(day),
      });
    add("lent", 5000, "2026-10-01");
    add("repaid_to_me", 2000, "2026-10-03");
    add("borrowed", 4000, "2026-10-05");
    const history = personHistory(db, asha.id);
    expect(
      history?.entries.map((e) => [e.item.kind, e.signed, e.balanceAfter]),
    ).toEqual([
      ["borrowed", -4000, -1000],
      ["repaid_to_me", -2000, 3000],
      ["lent", 5000, 5000],
    ]);
    expect(history?.balances).toEqual([{ currency: "INR", amount: -1000 }]);
    expect(history?.total).toBe(-1000);
    expect(personHistory(db, "ghost")).toBeUndefined();
  });
});

describe("settle", () => {
  it("records repaid_to_me when they owe me and repaid_by_me when I owe them", () => {
    const { db, cash, bank, asha, ravi } = setup();
    createTransaction(db, {
      kind: "lent",
      amount: 5000,
      accountId: cash.id,
      personId: asha.id,
      occurredAt: at("2026-10-01"),
    });
    createTransaction(db, {
      kind: "borrowed",
      amount: 3000,
      accountId: cash.id,
      personId: ravi.id,
      occurredAt: at("2026-10-01"),
    });

    const a = settle(db, {
      personId: asha.id,
      amount: 2000,
      accountId: bank.id,
      occurredAt: at("2026-10-10"),
    });
    expect(a).toMatchObject({
      kind: "repaid_to_me",
      amount: 2000,
      accountId: bank.id,
      personId: asha.id,
    });
    const r = settle(db, {
      personId: ravi.id,
      amount: 3000,
      accountId: cash.id,
      occurredAt: at("2026-10-10"),
    });
    expect(r.kind).toBe("repaid_by_me");

    const out = outstandingByPerson(db);
    expect(out.map((o) => [o.person.name, o.total])).toEqual([["Asha", 3000]]);
    expect(getAccountBalance(db, bank.id)).toBe(5000000 + 2000);
  });

  it("rejects settling nothing, too much, bad amounts and unknown ids", () => {
    const { db, cash, usd, asha } = setup();
    createTransaction(db, {
      kind: "lent",
      amount: 1000,
      accountId: cash.id,
      personId: asha.id,
      occurredAt: at("2026-10-01"),
    });
    expect(
      code(() =>
        settle(db, { personId: asha.id, amount: 1001, accountId: cash.id }),
      ),
    ).toBe("invalid_input");
    expect(
      code(() =>
        settle(db, { personId: asha.id, amount: 0, accountId: cash.id }),
      ),
    ).toBe("amount_not_positive");
    expect(
      code(() =>
        settle(db, { personId: asha.id, amount: 1.5, accountId: cash.id }),
      ),
    ).toBe("amount_not_integer");
    // nothing is owed in USD
    expect(
      code(() =>
        settle(db, { personId: asha.id, amount: 5, accountId: usd.id }),
      ),
    ).toBe("nothing_outstanding");
    expect(
      code(() =>
        settle(db, { personId: "ghost", amount: 5, accountId: cash.id }),
      ),
    ).toBe("person_not_found");
    expect(
      code(() =>
        settle(db, { personId: asha.id, amount: 5, accountId: "ghost" }),
      ),
    ).toBe("account_not_found");
    settle(db, { personId: asha.id, amount: 1000, accountId: cash.id });
    expect(
      code(() =>
        settle(db, { personId: asha.id, amount: 1, accountId: cash.id }),
      ),
    ).toBe("nothing_outstanding");
  });
});
