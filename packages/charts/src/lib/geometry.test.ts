import { barSlots, clampLabelX, barDomain, percentileOf, donutSegments, hitTestDonut, nearestPoint, niceTicks, slotIndex, valueToY } from './geometry';

describe('donutSegments', () => {
  it('fills the circle minus gaps and starts at 12 o clock', () => {
    const segs = donutSegments([50, 30, 20], 2);
    expect(segs[0]!.start).toBeCloseTo(-89);
    const total = segs.reduce((s, x) => s + x.sweep, 0);
    expect(total).toBeCloseTo(360 - 6);
    expect(segs[0]!.sweep).toBeCloseTo(177);
  });
  it('has no gap for a single segment and nothing for zeros', () => {
    expect(donutSegments([10], 2)[0]!.sweep).toBeCloseTo(360);
    expect(donutSegments([0, 0]).every((s) => s.sweep === 0)).toBe(true);
  });
});

describe('hitTestDonut', () => {
  const segs = donutSegments([50, 50], 2);
  it('finds the right half and left half', () => {
    // segment 0 spans from -89 clockwise through 3 o'clock
    expect(hitTestDonut(200, 110, 110, 110, 84, 106, segs)).toBe(0);
    expect(hitTestDonut(20, 110, 110, 110, 84, 106, segs)).toBe(1);
  });
  it('ignores the hole and outside', () => {
    expect(hitTestDonut(110, 110, 110, 110, 84, 106, segs)).toBe(-1);
    expect(hitTestDonut(400, 400, 110, 110, 84, 106, segs)).toBe(-1);
  });
});

describe('slot maths', () => {
  it('clamps scrub index', () => {
    expect(slotIndex(-20, 0, 300, 30)).toBe(0);
    expect(slotIndex(155, 0, 300, 30)).toBe(15);
    expect(slotIndex(900, 0, 300, 30)).toBe(29);
    expect(slotIndex(10, 0, 0, 5)).toBe(-1);
  });
  it('lays out bars centred in slots', () => {
    const slots = barSlots(0, 300, 30, 4, 40);
    expect(slots).toHaveLength(30);
    expect(slots[0]!.width).toBe(6);
    expect(slots[0]!.center).toBe(5);
    expect(barSlots(0, 100, 2, 4, 20)[0]!.width).toBe(20);
  });
  it('finds the nearest line point', () => {
    expect(nearestPoint(0, 0, 100, 11)).toBe(0);
    expect(nearestPoint(52, 0, 100, 11)).toBe(5);
    expect(nearestPoint(500, 0, 100, 11)).toBe(10);
  });
});

describe('niceTicks', () => {
  it('returns round gridlines', () => {
    const { top, ticks } = niceTicks(124000, 3);
    expect(ticks).toEqual([50000, 100000, 150000]);
    expect(top).toBe(150000);
  });
  it('is empty for no data', () => {
    expect(niceTicks(0).ticks).toEqual([]);
  });
  it('never exceeds the count', () => {
    for (const max of [1, 7, 99, 1234, 98765, 4_000_000]) expect(niceTicks(max, 3).ticks.length).toBeLessThanOrEqual(3);
  });
});

describe('misc', () => {
  it('maps values to y', () => {
    expect(valueToY(0, 100, 160, 160)).toBe(160);
    expect(valueToY(100, 100, 160, 160)).toBe(0);
    expect(valueToY(50, 0, 160, 160)).toBe(160);
  });
  it('clamps floating labels', () => {
    expect(clampLabelX(5, 80, 300)).toBe(0);
    expect(clampLabelX(295, 80, 300)).toBe(220);
    expect(clampLabelX(150, 80, 300)).toBe(110);
  });
});

describe('barDomain', () => {
  it('leaves ordinary data alone', () => {
    const d = barDomain([100, 200, 300, 250, 0], 170);
    expect(d.clipped).toBe(false);
    expect(d.top).toBeGreaterThanOrEqual(300);
  });
  it('caps at max(4 x average, p90) when one bar dwarfs the rest', () => {
    const values = [...Array.from({ length: 20 }, (_, i) => 1000 + i * 50), 3_200_000];
    const average = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    const d = barDomain(values, average);
    expect(d.clipped).toBe(true);
    expect(d.top).toBeGreaterThanOrEqual(4 * average);
    expect(d.top).toBeLessThan(3_200_000);
    expect(d.ticks.length).toBeLessThanOrEqual(3);
  });
  it('applies one rule to any series length', () => {
    const values = [...Array.from({ length: 19 }, (_, i) => 900 + i * 10), 9000];
    // p90 is about 1070 and 4 x average (4000) is larger, so the axis tops out at 4000.
    const d = barDomain(values, 1000);
    expect(d.clipped).toBe(true);
    expect(d.top).toBe(4000);
    // With a higher average the same tall bar fits and nothing is broken.
    expect(barDomain(values, 2500).clipped).toBe(false);
  });
  it('handles empty and zero data', () => {
    expect(barDomain([0, 0], 0)).toEqual({ top: 0, ticks: [], clipped: false });
    expect(percentileOf([0, 5, 1], 0.85)).toBe(5);
  });
});
