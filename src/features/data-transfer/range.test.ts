import { exportBounds } from './range';

const settings = { weekStart: 1, monthStart: 1 };
const custom = { from: '2024-02-10', to: '2024-02-01' };

describe('exportBounds', () => {
  it('is unbounded for All', () => {
    expect(exportBounds('all', '2024-03-15', custom, settings)).toEqual({});
  });

  it('covers the current month and year', () => {
    expect(exportBounds('month', '2024-03-15', custom, settings)).toEqual({ from: '2024-03-01', to: '2024-03-31' });
    expect(exportBounds('year', '2024-03-15', custom, settings)).toEqual({ from: '2024-01-01', to: '2024-12-31' });
  });

  it('honours the month start setting', () => {
    expect(exportBounds('month', '2024-03-15', custom, { weekStart: 1, monthStart: 20 })).toEqual({ from: '2024-02-20', to: '2024-03-19' });
  });

  it('swaps a reversed custom range', () => {
    expect(exportBounds('custom', '2024-03-15', custom, settings)).toEqual({ from: '2024-02-01', to: '2024-02-10' });
  });
});
