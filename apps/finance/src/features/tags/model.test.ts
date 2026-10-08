import {
  canCreateTag,
  categoryBreakdown,
  nextTagColor,
  tagColorKey,
  tagPillColors,
  TAG_COLORS,
} from "./model";

describe("tag colours", () => {
  it("tints the pill from the palette colour", () => {
    expect(tagPillColors("#64D8A4")).toEqual({
      fg: "#64D8A4",
      bg: "rgba(100,216,164,0.16)",
      ring: "rgba(100,216,164,0.45)",
    });
  });

  it("falls back to gray for unknown keys and picks an unused colour next", () => {
    expect(tagColorKey("teal")).toBe("teal");
    expect(tagColorKey("chartreuse")).toBe("gray");
    expect(nextTagColor([])).toBe(TAG_COLORS[0]);
    expect(nextTagColor([{ color: TAG_COLORS[0]! }])).toBe(TAG_COLORS[1]);
  });
});

describe("create row", () => {
  it("offers to create only a new, non-empty name (case-insensitive)", () => {
    const tags = [{ name: "Goa trip" }];
    expect(canCreateTag("goa TRIP ", tags)).toBe(false);
    expect(canCreateTag("Goa", tags)).toBe(true);
    expect(canCreateTag("   ", tags)).toBe(false);
  });
});

describe("categoryBreakdown", () => {
  const food = { id: "f", name: "Food", color: "orange", icon: "food" };
  const fun = { id: "g", name: "Fun", color: "pink", icon: "party" };
  const identity = (minor: number) => minor;
  it("sums expenses per category, splits included, and ignores other kinds", () => {
    const rows = categoryBreakdown(
      [
        {
          kind: "expense",
          amount: 300,
          currency: "INR",
          category: food,
          splits: [],
        },
        {
          kind: "expense",
          amount: 500,
          currency: "INR",
          category: null,
          splits: [
            { amount: 200, category: food },
            { amount: 300, category: fun },
          ],
        },
        {
          kind: "income",
          amount: 9999,
          currency: "INR",
          category: fun,
          splits: [],
        },
        {
          kind: "lent",
          amount: 9999,
          currency: "INR",
          category: null,
          splits: [],
        },
      ],
      identity,
    );
    expect(rows.map((r) => [r.name, r.amount, r.share])).toEqual([
      ["Food", 500, 1],
      ["Fun", 300, 0.6],
    ]);
  });
});
