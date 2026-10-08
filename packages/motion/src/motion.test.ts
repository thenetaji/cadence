import { collapseThen, registerCollapse } from "./collapse";
import { addedKeys, changedDigits, introDelay, splitNumber } from "./digits";
import { EntryTracker } from "./entry-tracker";
import { claimEntrance, resetEntrances } from "./session";
import { buildPolyPath, pointAt } from "./path-point";
import { motionAmount, motionMs, scrollProgress, staggerDelay } from "./timing";

describe("splitNumber", () => {
  it("separates digits from fixed glyphs", () => {
    const t = splitNumber("−₹1,240.50");
    expect(
      t
        .filter((x) => x.kind === "digit")
        .map((x) => (x.kind === "digit" ? x.digit : -1)),
    ).toEqual([1, 2, 4, 0, 5, 0]);
    expect(
      t
        .filter((x) => x.kind === "static")
        .map((x) => (x.kind === "static" ? x.char : "")),
    ).toEqual(["−", "₹", ",", "."]);
  });

  it("keys right-aligned columns by place so units stay put", () => {
    const a = splitNumber("₹1,240");
    const b = splitNumber("₹12,400");
    expect(addedKeys(a, b)).toEqual(["d4"]);
    expect(changedDigits(a, b).sort()).toEqual(["d1", "d2", "d3"]);
  });

  it("keys left-aligned columns by order so typing adds one column", () => {
    expect(
      addedKeys(splitNumber("12", "left"), splitNumber("123", "left")),
    ).toEqual(["d2"]);
    expect(
      changedDigits(splitNumber("12", "left"), splitNumber("123", "left")),
    ).toEqual([]);
  });

  it("reports nothing changed for identical values", () => {
    const t = splitNumber("₹5,000");
    expect(changedDigits(t, splitNumber("₹5,000"))).toEqual([]);
    expect(addedKeys(t, splitNumber("₹5,000"))).toEqual([]);
  });

  it("caps intro delay", () => {
    expect(introDelay(0)).toBe(0);
    expect(introDelay(3)).toBe(120);
    expect(introDelay(50)).toBe(320);
  });
});

describe("staggerDelay", () => {
  it("steps 35 ms and caps at 10", () => {
    expect(staggerDelay(0)).toBe(0);
    expect(staggerDelay(3)).toBe(105);
    expect(staggerDelay(9)).toBe(315);
    expect(staggerDelay(10)).toBeNull();
    expect(staggerDelay(500)).toBeNull();
  });
  it("honours base, custom cap and Reduce Motion", () => {
    expect(staggerDelay(2, { base: 100 })).toBe(170);
    expect(staggerDelay(4, { cap: 4 })).toBeNull();
    expect(staggerDelay(0, { reduced: true })).toBeNull();
    expect(staggerDelay(-1)).toBeNull();
  });
});

describe("Reduce Motion fallbacks", () => {
  it("collapses durations and amplitudes to zero", () => {
    expect(motionMs(true, 400)).toBe(0);
    expect(motionMs(false, 400)).toBe(400);
    expect(motionAmount(true, 12)).toBe(0);
    expect(motionAmount(false, 12)).toBe(12);
  });
});

describe("EntryTracker", () => {
  it("staggers the first batch, capped", () => {
    const t = new EntryTracker(3);
    t.sync(["a", "b", "c", "d"]);
    expect(t.peek("b")).toEqual({ kind: "stagger", index: 1 });
    expect(t.peek("d")).toBeUndefined();
  });
  it("marks a single later id as an insert and ignores bulk reloads", () => {
    const t = new EntryTracker();
    t.sync(["a", "b"]);
    t.consume("a");
    t.consume("b");
    t.sync(["new", "a", "b"]);
    expect(t.peek("new")).toEqual({ kind: "insert" });
    t.sync(["x", "y", "z", "w"]);
    expect(t.peek("x")).toBeUndefined();
  });
  it("treats data arriving after an empty render as the first batch", () => {
    const t = new EntryTracker();
    t.sync([]);
    t.sync(["a", "b"]);
    expect(t.peek("a")).toEqual({ kind: "stagger", index: 0 });
  });
  it("does not replay once consumed", () => {
    const t = new EntryTracker();
    t.sync(["a"]);
    t.consume("a");
    expect(t.peek("a")).toBeUndefined();
  });
});

describe("collapseThen", () => {
  it("runs the action straight away without a row", () => {
    const action = jest.fn(() => true);
    expect(collapseThen("missing", action)).toBe(true);
    expect(action).toHaveBeenCalled();
  });
  it("hands the action to the registered row once", () => {
    const run = jest.fn();
    const off = registerCollapse("r1", run);
    const action = jest.fn();
    collapseThen("r1", action);
    expect(run).toHaveBeenCalledWith(action);
    expect(action).not.toHaveBeenCalled();
    collapseThen("r1", action);
    expect(action).toHaveBeenCalledTimes(1);
    off();
  });
});

describe("pointAt", () => {
  const path = buildPolyPath([
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
  ]);
  it("walks the polyline by length", () => {
    expect(pointAt(path, 0)).toEqual({ x: 0, y: 0 });
    expect(pointAt(path, 0.5)).toEqual({ x: 10, y: 0 });
    expect(pointAt(path, 0.75)).toEqual({ x: 10, y: 5 });
    expect(pointAt(path, 2)).toEqual({ x: 10, y: 10 });
  });
});

describe("scrollProgress", () => {
  it("clamps between 0 and 1", () => {
    expect(scrollProgress(-10, 40, 100)).toBe(0);
    expect(scrollProgress(70, 40, 100)).toBe(0.5);
    expect(scrollProgress(500, 40, 100)).toBe(1);
  });
});

describe("claimEntrance", () => {
  it("allows each key once per session", () => {
    resetEntrances();
    expect(claimEntrance("/activity#0")).toBe(true);
    expect(claimEntrance("/activity#0")).toBe(false);
    expect(claimEntrance("/activity#1")).toBe(true);
  });
});
