import { cadenceLabel, nextChargeLabel } from "./labels";

describe("cadenceLabel", () => {
  it("names single and multiple intervals", () => {
    expect(cadenceLabel("monthly", 1)).toBe("Monthly");
    expect(cadenceLabel("monthly", 3)).toBe("Every 3 months");
    expect(cadenceLabel("weekly", 2)).toBe("Every 2 weeks");
    expect(cadenceLabel("yearly", 1)).toBe("Yearly");
  });
});

describe("nextChargeLabel", () => {
  it("uses relative days near, a date far", () => {
    expect(nextChargeLabel("2026-10-06", "2026-10-06")).toBe("Today");
    expect(nextChargeLabel("2026-10-07", "2026-10-06")).toBe("Tomorrow");
    expect(nextChargeLabel("2026-10-10", "2026-10-06")).toBe("in 4 days");
    expect(nextChargeLabel("2026-10-20", "2026-10-06")).toBe("20 Oct");
    expect(nextChargeLabel("2026-10-01", "2026-10-06")).toBe("1 Oct");
  });
});
