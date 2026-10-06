import { curveGeometry, dueIn, frequencyLabel, greetingFor, monotoneSegments, percentUsed } from './curve';

describe('monotoneSegments', () => {
  it('yields one segment per gap, ending on the data points', () => {
    const segs = monotoneSegments([[0, 0], [10, 5], [20, 5], [30, 20]]);
    expect(segs).toHaveLength(3);
    expect(segs[2]!.slice(4)).toEqual([30, 20]);
  });
  it('never overshoots a flat stretch', () => {
    const [, flat] = monotoneSegments([[0, 0], [10, 10], [20, 10], [30, 30]]);
    expect(flat![1]).toBe(10);
    expect(flat![3]).toBe(10);
  });
  it('is empty for fewer than two points', () => {
    expect(monotoneSegments([[0, 0]])).toEqual([]);
  });
});

describe('curveGeometry', () => {
  const series = [
    { actual: 100, pace: 50 },
    { actual: 300, pace: 150 },
    { actual: null, pace: 400 },
  ];
  it('stops the current line at today and reaches the edge with the ghost', () => {
    const g = curveGeometry(series, 300, 100);
    expect(g.line).toHaveLength(3);
    expect(g.ghost).toHaveLength(4);
    expect(g.ghost[3]![0]).toBe(300);
    expect(g.end![0]).toBe(200);
  });
  it('is empty without spend', () => {
    expect(curveGeometry([{ actual: 0, pace: 0 }], 300, 100).end).toBeNull();
  });
});

describe('format helpers', () => {
  it('greets by hour', () => {
    expect([4, 5, 11, 12, 16, 17, 23, 0].map(greetingFor)).toEqual([
      'Good evening', 'Good morning', 'Good morning', 'Good afternoon', 'Good afternoon', 'Good evening', 'Good evening', 'Good evening',
    ]);
  });
  it('percent used', () => {
    expect(percentUsed(16800, 35000)).toBe(48);
    expect(percentUsed(5, 0)).toBe(0);
  });
  it('labels frequency and due', () => {
    expect(frequencyLabel('monthly', 1)).toBe('Monthly');
    expect(frequencyLabel('weekly', 2)).toBe('Every 2 weeks');
    expect(dueIn(4)).toBe('in 4 days');
    expect(dueIn(1)).toBe('Tomorrow');
  });
});
