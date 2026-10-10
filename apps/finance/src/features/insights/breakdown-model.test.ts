import type { BreakdownSlice } from "@/data/hooks";
import {
  breakdownDonut,
  breakdownSummary,
  breakdownTitle,
  selectedSlices,
} from "./breakdown-model";
import { OTHER_KEY } from "./model";

const slice = (
  key: string,
  amount: number,
  percent: number,
): BreakdownSlice => ({
  key,
  name: key.toUpperCase(),
  icon: "tag.fill",
  color: "red",
  amount,
  percent,
  count: 1,
  target: null,
  children: [],
});
const fmt = {
  currency: "INR",
  locale: "en-IN",
  showDecimals: false,
  scheme: "light" as const,
};
const many = Array.from({ length: 8 }, (_, i) =>
  slice(`s${i}`, 800 - i * 100, 20 - i),
);

describe("breakdownTitle", () => {
  it("keeps the category wording and names other dimensions", () => {
    expect(breakdownTitle("category", "expense")).toBe("Spending by category");
    expect(breakdownTitle("category", "income")).toBe("Income by source");
    expect(breakdownTitle("group", "expense")).toBe("Spending by group");
    expect(breakdownTitle("tag", "income")).toBe("Income by tag");
  });
});

describe("breakdownDonut", () => {
  it("keeps six slices and folds the rest into Other", () => {
    const data = breakdownDonut(many, fmt);
    expect(data).toHaveLength(7);
    expect(data[6]).toMatchObject({
      key: OTHER_KEY,
      name: "Other",
      value: 300,
      percentLabel: "27%",
    });
  });
  it("adds no Other when everything fits", () => {
    expect(breakdownDonut(many.slice(0, 3), fmt).map((d) => d.key)).toEqual([
      "s0",
      "s1",
      "s2",
    ]);
  });
});

describe("selectedSlices", () => {
  it("filters to the selection, Other meaning the tail", () => {
    expect(selectedSlices(many, null)).toHaveLength(8);
    expect(selectedSlices(many, "s1").map((s) => s.key)).toEqual(["s1"]);
    expect(selectedSlices(many, OTHER_KEY).map((s) => s.key)).toEqual([
      "s6",
      "s7",
    ]);
  });
});

describe("breakdownSummary", () => {
  it("lists the donut's slices", () => {
    expect(breakdownSummary(many.slice(0, 2), "tag", "expense")).toBe(
      "Spending by tag: S0 20%, S1 19%",
    );
    expect(breakdownSummary([], "group", "expense")).toBe(
      "Spending by group: nothing in this period",
    );
  });
});
