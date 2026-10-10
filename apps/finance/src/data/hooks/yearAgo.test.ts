import { periodFor } from "@studio/dates";
import { yearAgoRange } from "./insights";

describe("yearAgoRange", () => {
  it("goes back twelve months for a month", () => {
    expect(yearAgoRange(periodFor("month", "2026-10-05"))).toEqual({
      from: "2025-10-01",
      to: "2025-10-31",
    });
  });
  it("goes back 52 weeks for a week so weekdays line up", () => {
    const week = periodFor("week", "2026-10-07");
    const range = yearAgoRange(week);
    expect(range.from).toBe("2025-10-06");
    expect(new Date(`${range.from}T00:00:00`).getDay()).toBe(
      new Date(`${week.from}T00:00:00`).getDay(),
    );
  });
});
