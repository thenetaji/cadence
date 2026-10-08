import { axisLabels, shortDay } from "./labels";

const days = (from: number, count: number) =>
  Array.from(
    { length: count },
    (_, i) => `2026-10-${String(from + i).padStart(2, "0")}`,
  );

describe("axisLabels", () => {
  it("labels every weekday for a week", () => {
    const labels = axisLabels(days(5, 7), "day");
    expect(labels.map((l) => l.text)).toEqual([
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
      "Sun",
    ]);
  });
  it("is sparse for a month and starts with 1 Oct", () => {
    const labels = axisLabels(days(1, 31), "day");
    expect(labels.length).toBeLessThanOrEqual(6);
    expect(labels[0]).toEqual({ index: 0, text: "1 Oct" });
    expect(labels[1]).toEqual({ index: 7, text: "8" });
  });
  it("names months for a year", () => {
    const keys = Array.from(
      { length: 12 },
      (_, i) => `2026-${String(i + 1).padStart(2, "0")}-01`,
    );
    const labels = axisLabels(keys, "month");
    expect(labels.map((l) => l.text)).toEqual([
      "Jan",
      "Mar",
      "May",
      "Jul",
      "Sep",
      "Nov",
    ]);
  });
  it("handles empty input", () => {
    expect(axisLabels([], "day")).toEqual([]);
  });
});

describe("shortDay", () => {
  it("formats weekday and day", () => {
    expect(shortDay("2026-10-07")).toBe("Wed 7");
  });
});
