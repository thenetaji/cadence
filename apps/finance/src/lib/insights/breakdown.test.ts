import { periodFor } from "@studio/dates";
import { makeRateLookup } from "@studio/money";
import {
  breakdownKeys,
  breakdownTotals,
  parseKey,
  type BreakdownBy,
  type BreakdownLookups,
} from "./breakdown";
import type { DetailedLine } from "./extras";

const ctx = {
  displayCurrency: "INR",
  rates: makeRateLookup([{ base: "USD", quote: "INR", rate: 80 }]),
};
const line = (
  transactionId: string,
  amount: number,
  over: Partial<DetailedLine> = {},
): DetailedLine => ({
  dateKey: "2026-10-05",
  amount,
  kind: "expense",
  categoryId: "food",
  currency: "INR",
  transactionId,
  title: "",
  accountId: "a1",
  ...over,
});
const october = periodFor("month", "2026-10-05");
const lookups: BreakdownLookups = {
  groupOf: (id) => (id === "food" || id === "groceries" ? "Essentials" : null),
  tagsOf: (id) =>
    id === "t1" ? ["trip", "work"] : id === "t2" ? ["trip"] : [],
};
const totals = (by: BreakdownBy, lines: DetailedLine[]) =>
  breakdownTotals(lines, "expense", october, ctx, (l) =>
    breakdownKeys(by, l, lookups),
  );

describe("breakdownKeys", () => {
  it("keys categories, with none for uncategorised", () => {
    expect(breakdownKeys("category", line("x", 1), lookups)).toEqual([
      "c:food",
    ]);
    expect(
      breakdownKeys("category", line("x", 1, { categoryId: null }), lookups),
    ).toEqual(["c:"]);
  });
  it("rolls grouped categories up and leaves the rest standing alone", () => {
    expect(breakdownKeys("group", line("x", 1), lookups)).toEqual([
      "g:Essentials",
    ]);
    expect(
      breakdownKeys("group", line("x", 1, { categoryId: "fun" }), lookups),
    ).toEqual(["c:fun"]);
  });
  it("lists every tag once, or the untagged bucket", () => {
    expect(breakdownKeys("tag", line("t1", 1), lookups)).toEqual([
      "t:trip",
      "t:work",
    ]);
    expect(breakdownKeys("tag", line("t3", 1), lookups)).toEqual(["t:"]);
  });
  it("normalises merchant titles", () => {
    expect(
      breakdownKeys("merchant", line("x", 1, { title: "  Swiggy " }), lookups),
    ).toEqual(["m:swiggy"]);
  });
});

describe("breakdownTotals", () => {
  it("sums groups, keeps ungrouped categories separate and sorts largest first", () => {
    const rows = totals("group", [
      line("1", 3000),
      line("2", 2000, { categoryId: "groceries" }),
      line("3", 4000, { categoryId: "fun" }),
      line("4", 9999, { kind: "income" }),
      line("5", 9999, { dateKey: "2026-09-30" }),
    ]);
    expect(rows.map((r) => [r.key, r.amount, r.percent, r.count])).toEqual([
      ["g:Essentials", 5000, 56, 2],
      ["c:fun", 4000, 44, 1],
    ]);
    expect(rows[0]?.categoryId).toBe("food");
  });
  it("counts a transaction under each of its tags, against the full total", () => {
    const rows = totals("tag", [
      line("t1", 1000),
      line("t2", 1000),
      line("t3", 2000),
    ]);
    expect(rows.map((r) => [r.key, r.amount, r.percent])).toEqual([
      ["t:trip", 2000, 50],
      ["t:", 2000, 50],
      ["t:work", 1000, 25],
    ]);
  });
  it("converts foreign amounts and keeps the first title as written", () => {
    const rows = totals("merchant", [
      line("1", 100, { currency: "USD", title: "Uber  Eats" }),
      line("2", 500, { title: "uber eats" }),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      key: "m:uber eats",
      amount: 8500,
      count: 2,
      title: "Uber Eats",
    });
  });
});

describe("parseKey", () => {
  it("splits prefix and id, keeping colons in the id", () => {
    expect(parseKey("g:Bills: home")).toEqual({
      prefix: "g",
      id: "Bills: home",
    });
    expect(parseKey("t:")).toEqual({ prefix: "t", id: "" });
  });
});
