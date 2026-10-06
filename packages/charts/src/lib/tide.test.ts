import {
  barRects,
  foldOlder,
  poolSamples,
  tideGeometry,
  tideRamp,
  tideWave,
} from "./tide";

describe("tide", () => {
  it("geometry puts the surface at 80% when spent is the reference", () => {
    const g = tideGeometry([100, 200, 400], 30, 400, 300, 120);
    expect(g.levelY).toBeCloseTo(120 - 0.8 * 120);
    expect(g.joinX).toBeCloseTo(30);
    expect(g.shore[0]).toEqual([0, 120]);
  });
  it("a bigger reference lowers the water", () => {
    const g = tideGeometry([100], 30, 1000, 300, 120);
    expect(g.levelY).toBeGreaterThan(100);
  });
  it("empty data stays at the baseline", () => {
    expect(tideGeometry([], 30, 0, 300, 120).levelY).toBe(120);
  });
  it("ramp is 0 at the join and 1 after 28 pt", () => {
    expect(tideRamp(100, 100)).toBe(0);
    expect(tideRamp(128, 100)).toBe(1);
    expect(tideRamp(90, 100)).toBe(0);
  });
  it("wave stays inside the summed amplitude", () => {
    for (let x = 0; x < 400; x += 7)
      expect(Math.abs(tideWave(x, 3.3))).toBeLessThanOrEqual(2.5);
    expect(tideWave(10, 2, 0.37, 1.25)).toBeCloseTo(
      tideWave(10, 2, 0.37, 1) * 1.25,
    );
  });
  it("pool samples end on the edge", () => {
    const xs = poolSamples(100, 361);
    expect(xs[0]).toBe(103);
    expect(xs[xs.length - 1]).toBe(361);
  });
  it("bars: centred slots, minimum nub, tallest fills", () => {
    const r = barRects([10, 1000, 0], 360, 88);
    expect(r[0]!.width).toBe(40);
    expect(r[0]!.x).toBe(40);
    expect(r[1]!.height).toBe(88);
    expect(r[0]!.height).toBe(6);
    expect(r[2]!.height).toBe(0);
  });
  it("folds older months into the leftmost bar", () => {
    const items = Array.from({ length: 14 }, (_, i) => ({
      label: String(i),
      amount: 1,
      current: i === 13,
    }));
    const out = foldOlder(items, 12);
    expect(out).toHaveLength(12);
    expect(out[0]!.amount).toBe(3);
    expect(out[11]!.current).toBe(true);
  });
});
