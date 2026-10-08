import { rankQuickAdd, type QuickAddCandidate } from "./useQuickAdd";

const tx = (
  title: string,
  categoryId: string | null,
  at: number,
  kind = "expense",
  accountId = "a1",
): QuickAddCandidate => ({
  title,
  categoryId,
  accountId,
  kind,
  occurredAt: at,
});

describe("rankQuickAdd", () => {
  it("ranks by count, then recency", () => {
    const rows = [
      tx("Chai", "c1", 1),
      tx("Chai", "c1", 2),
      tx("Uber", "c2", 5),
      tx("Uber", "c2", 9),
      tx("Metro", "c2", 20),
    ];
    expect(rankQuickAdd(rows, 8).map((r) => r.title)).toEqual([
      "Uber",
      "Chai",
      "Metro",
    ]);
  });

  it("keeps the same title in different categories apart and matches case-insensitively", () => {
    const rows = [
      tx("swiggy", "food", 1),
      tx("Swiggy", "food", 2),
      tx("Swiggy", "groc", 3),
    ];
    const out = rankQuickAdd(rows, 8);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({
      title: "Swiggy",
      categoryId: "food",
      count: 2,
    });
  });

  it("skips transfers, lending and blank titles, and honours the limit", () => {
    const rows = [
      tx("Rent", null, 1, "transfer"),
      tx("Ravi", null, 2, "lent"),
      tx("  ", "c", 3),
      tx("A", "c", 4),
      tx("B", "c", 5),
    ];
    expect(rankQuickAdd(rows, 1).map((r) => r.title)).toEqual(["B"]);
    expect(rankQuickAdd(rows, 8).map((r) => r.title)).toEqual(["B", "A"]);
  });

  it("takes account and kind from the latest use", () => {
    const rows = [
      tx("Chai", "c", 1, "expense", "cash"),
      tx("Chai", "c", 9, "expense", "upi"),
    ];
    expect(rankQuickAdd(rows, 8)[0]).toMatchObject({
      accountId: "upi",
      kind: "expense",
    });
  });
});
