import { listDays } from "@studio/dates";

import {
  buildHeatmap,
  heatLevelFor,
  heatmapEnd,
  heatmapStart,
  heatScale,
  weeksThatFit,
} from "./model";

describe("heatmap range", () => {
  // 2026-10-08 is a Thursday.
  it("starts on the week start and ends on the last day of the current week", () => {
    expect(heatmapStart("2026-10-08", 1, 1)).toBe("2026-10-05");
    expect(heatmapEnd("2026-10-08", 1)).toBe("2026-10-11");
    expect(heatmapStart("2026-10-08", 1, 7)).toBe("2026-10-04");
    expect(heatmapEnd("2026-10-08", 7)).toBe("2026-10-10");
    expect(heatmapStart("2026-10-08", 3, 1)).toBe("2026-09-21");
  });
});

describe("heatScale", () => {
  it("uses the 90th percentile of spending days so one outlier does not dominate", () => {
    const amounts = [0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 100000];
    expect(heatScale(amounts)).toBe(900);
    expect(heatScale([0, 0])).toBe(0);
    expect(heatScale([50])).toBe(50);
  });

  it("maps amounts to levels 1..6 and caps outliers", () => {
    expect(heatLevelFor(0, 900)).toBe(0);
    expect(heatLevelFor(1, 900)).toBe(1);
    expect(heatLevelFor(900, 900)).toBe(6);
    expect(heatLevelFor(100000, 900)).toBe(6);
  });
});

describe("buildHeatmap", () => {
  const from = heatmapStart("2026-10-08", 3, 1);
  const to = heatmapEnd("2026-10-08", 1);
  const days = listDays(from, to).map((dateKey) => ({
    dateKey,
    amount:
      dateKey.endsWith("-10") || dateKey > "2026-10-08"
        ? 5000
        : dateKey === "2026-09-26"
          ? 2000
          : 0,
  }));
  const model = buildHeatmap(days, "2026-10-08");

  it("lays out week columns of seven with future days blanked", () => {
    expect(model.columns).toHaveLength(3);
    expect(model.columns.every((c) => c.cells.length === 7)).toBe(true);
    const last = model.columns[2]!.cells;
    expect(last[3]).toMatchObject({ dateKey: "2026-10-08", future: false });
    expect(last[4]).toMatchObject({
      dateKey: "2026-10-09",
      future: true,
      amount: 0,
      level: 0,
    });
  });

  it("labels the week holding the 1st of a month and drops a first-column label that would collide", () => {
    expect(model.columns.map((c) => c.monthLabel)).toEqual([null, "Oct", null]);
    const wide = heatmapStart("2026-10-08", 6, 1);
    const longer = buildHeatmap(
      listDays(wide, heatmapEnd("2026-10-08", 1)).map((dateKey) => ({
        dateKey,
        amount: 0,
      })),
      "2026-10-08",
    );
    expect(longer.columns.map((c) => c.monthLabel)).toEqual([
      "Sep",
      null,
      null,
      null,
      "Oct",
      null,
    ]);
  });

  it("counts active days and finds the busiest weekday from past days only", () => {
    expect(model.activeDays).toBe(1);
    // 26 Sep 2026 is a Saturday: index 5 with a Monday week start.
    expect(model.busiestWeekday).toBe(5);
    expect(model.weekdayAverages[5]).toBe(Math.round(2000 / 2));
  });
});

describe("weeksThatFit", () => {
  it("fits whole weeks and clamps to the maximum", () => {
    expect(weeksThatFit(0, 14, 4)).toBe(0);
    expect(weeksThatFit(325, 14, 4)).toBe(18);
    expect(weeksThatFit(2000, 14, 4)).toBe(26);
  });
});
