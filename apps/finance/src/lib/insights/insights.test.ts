import { makeRateLookup } from "@studio/money";
import {
  averageOf,
  buildSeries,
  categoryTotals,
  deltaVsPrevious,
  granularityFor,
  groupTopCategories,
  paceSeries,
  sumLines,
} from "./aggregate";
import type { FlatLine } from "./types";
import { customPeriod, periodFor } from "@studio/dates";

const ctx = {
  displayCurrency: "INR",
  rates: makeRateLookup([{ base: "USD", quote: "INR", rate: 80 }]),
};
const line = (
  dateKey: string,
  amount: number,
  categoryId: string | null,
  over: Partial<FlatLine> = {},
): FlatLine => ({
  dateKey,
  amount,
  categoryId,
  kind: "expense",
  currency: "INR",
  ...over,
});
const october = periodFor("month", "2026-10-05");

describe("categoryTotals", () => {
  const lines = [
    line("2026-10-01", 10000, "food"),
    line("2026-10-02", 30000, "food"),
    line("2026-10-02", 20000, "travel"),
    line("2026-10-03", 100, "food", { currency: "USD" }),
    line("2026-10-03", 5000, "salary", { kind: "income" }),
    line("2026-09-30", 99999, "food"),
  ];

  it("sums per category, converting currencies and ignoring other kinds and periods", () => {
    const totals = categoryTotals(lines, "expense", october, ctx);
    expect(totals.map((t) => [t.categoryId, t.amount])).toEqual([
      ["food", 48000],
      ["travel", 20000],
    ]);
    expect(totals[0]?.percent).toBe(71);
  });

  it("filters by kind", () => {
    expect(categoryTotals(lines, "income", october, ctx)).toEqual([
      { categoryId: "salary", amount: 5000, percent: 100 },
    ]);
    expect(sumLines(lines, "expense", october, ctx)).toBe(68000);
  });

  it("returns nothing for an empty period", () => {
    expect(categoryTotals([], "expense", october, ctx)).toEqual([]);
  });
});

describe("groupTopCategories", () => {
  it("keeps the top 8 and folds the rest into Other", () => {
    const totals = Array.from({ length: 11 }, (_, i) => ({
      categoryId: `c${i}`,
      amount: (11 - i) * 100,
      percent: 9,
    }));
    const grouped = groupTopCategories(totals, 8);
    expect(grouped).toHaveLength(9);
    expect(grouped[8]).toEqual({
      categoryId: null,
      amount: 300 + 200 + 100,
      percent: 27,
      isOther: true,
    });
    expect(grouped.slice(0, 8).every((g) => !g.isOther)).toBe(true);
  });
  it("adds no Other bucket when there are 8 or fewer", () => {
    const totals = Array.from({ length: 8 }, (_, i) => ({
      categoryId: `c${i}`,
      amount: 1,
      percent: 12,
    }));
    expect(groupTopCategories(totals)).toHaveLength(8);
  });
});

describe("series", () => {
  const lines = [
    line("2026-10-01", 100, "a"),
    line("2026-10-01", 50, "b"),
    line("2026-10-31", 70, "a"),
    line("2026-11-01", 5, "a"),
  ];

  it("builds a daily series covering every day", () => {
    const series = buildSeries(lines, "expense", october, ctx);
    expect(series).toHaveLength(31);
    expect(series[0]).toEqual({ key: "2026-10-01", amount: 150 });
    expect(series[30]).toEqual({ key: "2026-10-31", amount: 70 });
    expect(series[1]?.amount).toBe(0);
  });

  it("filters a series by category", () => {
    expect(
      buildSeries(lines, "expense", october, ctx, { categoryId: "b" })[0]
        ?.amount,
    ).toBe(50);
  });

  it("buckets year and long custom ranges by month", () => {
    const year = periodFor("year", "2026-10-05");
    const series = buildSeries(lines, "expense", year, ctx);
    expect(series).toHaveLength(12);
    expect(series[9]).toEqual({ key: "2026-10-01", amount: 220 });
    expect(series[10]?.amount).toBe(5);
    expect(granularityFor(customPeriod("2026-01-01", "2026-06-01"))).toBe(
      "month",
    );
    expect(granularityFor(customPeriod("2026-01-01", "2026-03-01"))).toBe(
      "day",
    );
  });

  it("averages with half-up rounding", () => {
    expect(
      averageOf([
        { key: "a", amount: 1 },
        { key: "b", amount: 2 },
      ]),
    ).toBe(2);
    expect(averageOf([])).toBe(0);
    expect(
      averageOf([
        { key: "a", amount: 10 },
        { key: "b", amount: 20 },
        { key: "c", amount: 0 },
      ]),
    ).toBe(10);
  });
});

describe("deltaVsPrevious", () => {
  it("computes percent change or null", () => {
    expect(deltaVsPrevious(88, 100)).toEqual({ amount: -12, percent: -12 });
    expect(deltaVsPrevious(150, 100).percent).toBe(50);
    expect(deltaVsPrevious(10, 0)).toEqual({ amount: 10, percent: null });
  });
});

describe("paceSeries", () => {
  it("accumulates actuals up to today and spreads the budget evenly", () => {
    const period = { from: "2026-10-01", to: "2026-10-04" };
    const lines = [
      line("2026-10-01", 100, "a"),
      line("2026-10-03", 50, "a"),
      line("2026-10-02", 999, "x", { kind: "income" }),
    ];
    const pace = paceSeries(lines, period, 400, "2026-10-03", ctx);
    expect(pace.map((p) => p.actual)).toEqual([100, 100, 150, null]);
    expect(pace.map((p) => p.pace)).toEqual([100, 200, 300, 400]);
  });
  it("applies a scope matcher", () => {
    const pace = paceSeries(
      [line("2026-10-01", 100, "a"), line("2026-10-01", 50, "b")],
      { from: "2026-10-01", to: "2026-10-02" },
      200,
      "2026-10-02",
      ctx,
      (l) => l.categoryId === "b",
    );
    expect(pace[1]?.actual).toBe(50);
  });
});
