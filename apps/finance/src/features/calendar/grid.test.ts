import {
  buildMonthGrid,
  heatLevel,
  heatOpacity,
  leadingBlanks,
  monthOf,
  shiftMonth,
  weekdayLetters,
} from "./grid";

const days = (n: number, amount = 0) =>
  Array.from({ length: n }, (_, i) => ({
    dateKey: `2026-10-${String(i + 1).padStart(2, "0")}`,
    amount,
  }));

describe("heatLevel", () => {
  it("is 0 for no spend or an empty month", () => {
    expect(heatLevel(0, 100)).toBe(0);
    expect(heatLevel(50, 0)).toBe(0);
  });
  it("maps onto six steps, never below 1 for spend", () => {
    expect(heatLevel(1, 1000)).toBe(1);
    expect(heatLevel(500, 1000)).toBe(3);
    expect(heatLevel(501, 1000)).toBe(4);
    expect(heatLevel(1000, 1000)).toBe(6);
  });
  it("opacity grows with level", () => {
    expect(heatOpacity(0)).toBe(0);
    expect(heatOpacity(6)).toBeGreaterThan(heatOpacity(1));
  });
});

describe("month grid", () => {
  it("pads the first row by week start", () => {
    // 1 Oct 2026 is a Thursday (4).
    expect(leadingBlanks(4, 1)).toBe(3);
    expect(leadingBlanks(4, 7)).toBe(4);
    expect(leadingBlanks(7, 7)).toBe(0);
    expect(leadingBlanks(7, 1)).toBe(6);
    expect(leadingBlanks(1, 7)).toBe(1);
  });
  it("builds full weeks with blanks at both ends", () => {
    const rows = buildMonthGrid(days(31), 0, 4, 1);
    expect(rows).toHaveLength(5);
    expect(rows.every((r) => r.length === 7)).toBe(true);
    expect(rows[0]?.slice(0, 3)).toEqual([null, null, null]);
    expect(rows[0]?.[3]?.day).toBe(1);
    expect(rows[4]?.[6]).toBeNull();
    expect(rows.flat().filter(Boolean)).toHaveLength(31);
  });
  it("carries heat levels", () => {
    const d = days(28);
    d[1] = { ...d[1]!, amount: 100 };
    const cell = buildMonthGrid(d, 100, 1, 1)
      .flat()
      .find((c) => c?.day === 2);
    expect(cell?.level).toBe(6);
  });
  it("orders weekday letters", () => {
    expect(weekdayLetters(1).join("")).toBe("MTWTFSS");
    expect(weekdayLetters(7).join("")).toBe("SMTWTFS");
  });
});

describe("month keys", () => {
  it("shifts across years", () => {
    expect(shiftMonth("2026-10", 1)).toBe("2026-11");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(monthOf("2026-10-06")).toBe("2026-10");
  });
});
