import type { TransactionListItem } from "@/data/hooks";
import { makeRateLookup } from "@studio/money";

import { repeatLabel } from "./repeat-label";
import { toRowModel, type RowModelContext } from "./row-model";

const ctx: RowModelContext = {
  displayCurrency: "INR",
  locale: "en-IN",
  showDecimals: true,
  rates: makeRateLookup([{ base: "USD", quote: "INR", rate: 84.5 }]),
};

const food = {
  id: "c1",
  name: "Food & Drink",
  icon: "fork.knife",
  color: "orange",
};
const bank = {
  id: "a1",
  name: "HDFC",
  icon: "building.columns.fill",
  color: "blue",
  currency: "INR",
};
const cash = {
  id: "a2",
  name: "Cash",
  icon: "banknote",
  color: "green",
  currency: "INR",
};
const at = new Date(2026, 9, 3, 14, 32).getTime();

function item(patch: Partial<TransactionListItem>): TransactionListItem {
  return {
    id: "t1",
    kind: "expense",
    title: "Swiggy",
    memo: "",
    amount: 124000,
    currency: "INR",
    accountId: "a1",
    categoryId: "c1",
    transferAccountId: null,
    transferAmount: null,
    transferCurrency: null,
    occurredAt: at,
    dateKey: "2026-10-03",
    isSplit: false,
    recurringRuleId: null,
    personId: null,
    createdAt: 0,
    updatedAt: 0,
    category: food,
    account: bank,
    transferAccount: null,
    splits: [],
    tags: [],
    person: null,
    attachments: [],
    ...patch,
  };
}

describe("toRowModel", () => {
  it("maps an expense", () => {
    expect(toRowModel(item({}), ctx)).toMatchObject({
      kind: "expense",
      title: "Swiggy",
      subtitle: "Food & Drink · HDFC",
      amount: "−₹1,240.00",
      trailing: "14:32",
      icon: "fork.knife",
      color: "orange",
      split: false,
    });
  });

  it("maps income with a plus and honours show decimals", () => {
    const model = toRowModel(item({ kind: "income", amount: 14500000 }), {
      ...ctx,
      showDecimals: false,
    });
    expect(model.amount).toBe("+₹1,45,000");
  });

  it("maps a transfer without a sign", () => {
    const model = toRowModel(
      item({
        kind: "transfer",
        title: "",
        category: null,
        categoryId: null,
        account: cash,
        transferAccount: bank,
        transferAccountId: "a1",
      }),
      ctx,
    );
    expect(model).toMatchObject({
      title: "Cash → HDFC",
      amount: "₹1,240.00",
      icon: "arrow.left.arrow.right",
      color: "gray",
      subtitle: "Transfer",
    });
    expect(model.accessibilityLabel).toBe(
      "Cash to HDFC, Transfer, 1,240 rupees, 14:32",
    );
  });

  it("maps a split to a category count", () => {
    const splits = [
      { id: "s1", categoryId: "c1", amount: 100, sortOrder: 0, category: food },
      {
        id: "s2",
        categoryId: "c2",
        amount: 100,
        sortOrder: 1,
        category: { id: "c2", name: "Fun", icon: "film.fill", color: "pink" },
      },
      {
        id: "s3",
        categoryId: "c3",
        amount: 100,
        sortOrder: 2,
        category: { id: "c3", name: "Gifts", icon: "gift.fill", color: "red" },
      },
    ];
    const model = toRowModel(
      item({ isSplit: true, category: null, categoryId: null, splits }),
      ctx,
    );
    expect(model).toMatchObject({
      subtitle: "3 categories · HDFC",
      split: true,
      icon: "fork.knife",
      color: "orange",
    });
  });

  it("shows the original amount and the converted one for foreign currency", () => {
    const model = toRowModel(item({ currency: "USD", amount: 1200 }), ctx);
    expect(model.amount).toBe("−$12.00");
    expect(model.trailing).toBe("≈ ₹1,014.00");
    expect(model.accessibilityLabel).toContain(
      "minus 12 US dollars, about 1,014 rupees",
    );
  });

  it("falls back to the time when no rate is known", () => {
    const model = toRowModel(item({ currency: "EUR", amount: 1200 }), ctx);
    expect(model.trailing).toBe("14:32");
  });

  it("uses short days when relative", () => {
    const rel = { ...ctx, relativeTo: "2026-10-04" };
    expect(toRowModel(item({}), rel).trailing).toBe("Yesterday");
    expect(
      toRowModel(item({}), { ...ctx, relativeTo: "2026-10-09" }).trailing,
    ).toBe("3 Oct");
    expect(
      toRowModel(item({}), { ...ctx, relativeTo: "2026-10-03" }).trailing,
    ).toBe("14:32");
  });

  it("falls back to the category for an empty title and speaks the row in order", () => {
    const model = toRowModel(item({ title: "" }), ctx);
    expect(model.title).toBe("Food & Drink");
    expect(model.accessibilityLabel).toBe(
      "Food & Drink, Food & Drink, HDFC, minus 1,240 rupees, 14:32",
    );
  });
});

describe("repeatLabel", () => {
  it("formats cadence and next due date", () => {
    expect(
      repeatLabel({ frequency: "monthly", interval: 1, nextDue: "2026-11-03" }),
    ).toBe("Monthly · next 3 Nov");
    expect(
      repeatLabel({ frequency: "weekly", interval: 2, nextDue: "2026-11-03" }),
    ).toBe("Every 2 weeks · next 3 Nov");
  });
});
