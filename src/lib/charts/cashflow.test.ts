import { buildDuo, cumulativeUntil, duoGeometry, flowScale, gapSegments, netOffsets, runningNet, sampleSmooth, yOnLine } from './cashflow';

describe('cumulative duo series', () => {
  it('sums and blanks the future', () => {
    expect(cumulativeUntil([1, 0, 4, 2], 2)).toEqual([1, 1, 5, null]);
  });
  it('pairs in and out and pads the shorter list', () => {
    const duo = buildDuo([100, 0, 0], [10, 20], 1);
    expect(duo).toEqual([
      { in: 100, out: 10 },
      { in: 100, out: 30 },
      { in: null, out: null },
    ]);
  });
});

describe('duoGeometry', () => {
  const duo = buildDuo([0, 0, 1000, 0], [100, 100, 100, 100], 3);
  const geo = duoGeometry(duo, 400, 150);
  it('shares one axis and ends both lines at today', () => {
    expect(geo.inEnd![0]).toBe(400);
    expect(geo.outEnd![0]).toBe(400);
    expect(geo.max).toBeCloseTo(1080);
    expect(geo.inEnd![1]).toBeLessThan(geo.outEnd![1]);
  });
  it('steps money in on the day the lump lands', () => {
    const ys = geo.inLine.map((p) => p[1]);
    // Flat until day 3, then a steep climb.
    expect(ys[1]).toBe(ys[0]);
    expect(ys[ys.length - 1]).toBeLessThan(ys[0]!);
    expect(geo.hasIncome).toBe(true);
  });
  it('keeps a tiny out total visible above the baseline', () => {
    const tiny = duoGeometry(buildDuo([1_000_000, 0], [1, 0], 1), 300, 150);
    expect(tiny.outEnd![1]).toBeLessThanOrEqual(150 - 4 - 1.5 + 1e-9);
  });
  it('is empty without data', () => {
    expect(duoGeometry([], 100, 100).inLine).toEqual([]);
    expect(duoGeometry(buildDuo([0], [0], 0), 100, 100).outEnd).toBeNull();
  });
  it('reports no income', () => {
    expect(duoGeometry(buildDuo([0, 0], [5, 5], 1), 100, 100).hasIncome).toBe(false);
  });
});

describe('gapSegments', () => {
  it('fills "in" where in is above out', () => {
    const segs = gapSegments([[0, 100], [100, 20]], [[0, 100], [100, 80]]);
    expect(segs).toHaveLength(1);
    expect(segs[0]!.kind).toBe('in');
  });
  it('splits at a crossing', () => {
    // out starts above in (smaller y... in below), then in climbs past it.
    const segs = gapSegments([[0, 100], [100, 0]], [[0, 50], [100, 50]]);
    expect(segs.map((s) => s.kind)).toEqual(['out', 'in']);
    const crossing = segs[0]!.polygon.find((p) => p[0] === 50);
    expect(crossing).toBeDefined();
    expect(crossing![1]).toBeCloseTo(50);
  });
  it('drops identical lines', () => {
    expect(gapSegments([[0, 10], [10, 10]], [[0, 10], [10, 10]])).toEqual([]);
  });
});

describe('sampling', () => {
  it('samples a smooth curve through its points', () => {
    const dense = sampleSmooth([[0, 100], [50, 60], [100, 10]], 4);
    expect(dense).toHaveLength(9);
    expect(dense[dense.length - 1]).toEqual([100, 10]);
  });
  it('interpolates a polyline', () => {
    expect(yOnLine([[0, 0], [10, 20]], 5)).toBe(10);
    expect(yOnLine([[0, 0], [10, 20]], 99)).toBe(20);
  });
});

describe('flowScale', () => {
  const day = (income: number, spent: number) => ({ key: 'k', income, spent });
  it('clips a salary outlier but keeps one px-per-unit scale', () => {
    const data = [day(0, 1000), day(0, 1500), day(0, 800), day(0, 1200), day(0, 900), day(0, 1100), day(0, 700), day(0, 1300), day(0, 1000), day(500_000, 0)];
    const scale = flowScale(data, 160);
    expect(scale.upClipped).toBe(true);
    expect(scale.upTop).toBeLessThan(500_000);
    expect(scale.pxPerUnit * (scale.upTop + scale.downTop)).toBeCloseTo(160);
    expect(scale.zeroY).toBeCloseTo(scale.upTop * scale.pxPerUnit);
  });
  it('leaves room above zero when nothing was earned', () => {
    const scale = flowScale([day(0, 100), day(0, 200)], 100);
    expect(scale.upTop).toBeGreaterThan(0);
    expect(scale.zeroY).toBeGreaterThan(0);
  });
  it('handles empty data', () => {
    expect(flowScale([], 100).pxPerUnit).toBe(0);
  });
});

describe('running net', () => {
  it('accumulates income minus spending', () => {
    expect(runningNet([{ key: 'a', income: 10, spent: 4 }, { key: 'b', income: 0, spent: 9 }])).toEqual([6, -3]);
  });
  it('fits the net line inside both halves', () => {
    const scale = flowScale([{ key: 'a', income: 1000, spent: 0 }, { key: 'b', income: 0, spent: 3000 }], 100);
    const offsets = netOffsets([1000, -2000], scale, 100);
    expect(Math.min(...offsets)).toBeGreaterThanOrEqual(-scale.zeroY);
    expect(Math.max(...offsets)).toBeLessThanOrEqual(100 - scale.zeroY);
  });
});
