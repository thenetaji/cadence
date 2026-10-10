import { runningComparison } from "./running";

const pts = (keys: string[], amounts: number[]) =>
  keys.map((key, i) => ({ key, amount: amounts[i] ?? 0 }));

describe("runningComparison", () => {
  const current = pts(
    ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"],
    [100, 0, 50, 70],
  );
  const previous = pts(
    ["2026-09-01", "2026-09-02", "2026-09-03"],
    [40, 40, 40],
  );

  it("adds up both periods and stops the current one at today", () => {
    const r = runningComparison(current, previous, "2026-10-02");
    expect(r.current).toEqual([100, 100, null, null]);
    expect(r.previous).toEqual([40, 80, 120, 120]);
    expect(r.todayIndex).toBe(1);
    expect(r.difference).toBe(20);
  });
  it("compares a finished period end to end", () => {
    const r = runningComparison(current, previous);
    expect(r.current).toEqual([100, 100, 150, 220]);
    expect(r.difference).toBe(100);
  });
  it("has no difference before the period starts or without a previous period", () => {
    expect(runningComparison(current, previous, "2026-09-30").difference).toBe(
      null,
    );
    expect(runningComparison(current, [], "2026-10-04").difference).toBe(null);
  });
});
