import { periodFor } from '../dates';
import { makeRateLookup } from '../money';
import { cashFlowSeries, monthlyTotals } from './cashflow';
import type { FlatLine } from './types';

const ctx = { displayCurrency: 'INR', rates: makeRateLookup([{ base: 'USD', quote: 'INR', rate: 80 }]) };
const line = (dateKey: string, amount: number, kind: FlatLine['kind'], currency = 'INR'): FlatLine => ({ dateKey, amount, kind, categoryId: null, currency });

describe('cashFlowSeries', () => {
  const lines = [line('2026-10-01', 100000, 'income'), line('2026-10-01', 2000, 'expense'), line('2026-10-03', 5000, 'expense'), line('2026-09-30', 9999, 'expense')];
  it('buckets income and spending per day with a net', () => {
    const flow = cashFlowSeries(lines, periodFor('month', '2026-10-05'), ctx);
    expect(flow.granularity).toBe('day');
    expect(flow.points).toHaveLength(31);
    expect(flow.points[0]).toEqual({ key: '2026-10-01', income: 100000, spent: 2000, net: 98000 });
    expect(flow.points[2]).toEqual({ key: '2026-10-03', income: 0, spent: 5000, net: -5000 });
    expect(flow.totalIn).toBe(100000);
    expect(flow.totalOut).toBe(7000);
  });
  it('goes monthly for a year', () => {
    const flow = cashFlowSeries(lines, periodFor('year', '2026-10-05'), ctx);
    expect(flow.granularity).toBe('month');
    expect(flow.points).toHaveLength(12);
    expect(flow.points[8]!.spent).toBe(9999);
  });
});

describe('monthlyTotals', () => {
  it('sums each period and converts currencies', () => {
    const sept = periodFor('month', '2026-09-10');
    const oct = periodFor('month', '2026-10-10');
    const out = monthlyTotals([line('2026-09-30', 100, 'expense'), line('2026-10-01', 50, 'income', 'USD'), line('2026-10-02', 7, 'expense')], [sept, oct], ctx);
    expect(out.map((m) => [m.income, m.spent])).toEqual([[0, 100], [4000, 7]]);
    expect(out[1]!.key).toBe(oct.from);
  });
});
