import { periodFor } from '@studio/dates';
import { makeRateLookup } from '@studio/money';
import { biggest, byAccount, countWeekday, dailyAverage, normaliseTitle, pairedMonthly, peakIndex, savingsRate, topTitles, transactionTotals, weekdayAverages, type DetailedLine } from './extras';

const ctx = { displayCurrency: 'INR', rates: makeRateLookup([{ base: 'USD', quote: 'INR', rate: 80 }]) };
const line = (dateKey: string, amount: number, over: Partial<DetailedLine> = {}): DetailedLine => ({
  dateKey,
  amount,
  kind: 'expense',
  categoryId: 'food',
  currency: 'INR',
  transactionId: `${dateKey}-${amount}`,
  title: '',
  accountId: 'a1',
  ...over,
});
// 2026-10-05 is a Monday.
const october = periodFor('month', '2026-10-05');

describe('countWeekday', () => {
  it('counts each weekday in a month', () => {
    // Oct 2026: Thursday 1st, 31 days -> Thu, Fri, Sat appear 5 times.
    expect([1, 2, 3, 4, 5, 6, 7].map((d) => countWeekday(october, d))).toEqual([4, 4, 4, 5, 5, 5, 4]);
  });
  it('handles short ranges', () => {
    expect(countWeekday({ from: '2026-10-05', to: '2026-10-05' }, 1)).toBe(1);
    expect(countWeekday({ from: '2026-10-05', to: '2026-10-05' }, 2)).toBe(0);
  });
});

describe('weekdayAverages', () => {
  const lines = [line('2026-10-03', 5000), line('2026-10-10', 3000), line('2026-10-04', 700), line('2026-10-06', 100, { kind: 'income' })];
  it('averages over every such weekday, counting zero weeks', () => {
    const out = weekdayAverages(lines, 'expense', october, 1, ctx);
    expect(out.map((d) => d.weekday)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    const sat = out[5]!;
    expect(sat).toMatchObject({ weekday: 6, total: 8000, occurrences: 5, average: 1600 });
    expect(out[0]?.average).toBe(0);
    expect(out[6]).toMatchObject({ total: 700, occurrences: 4, average: 175 });
  });
  it('honours the week start', () => {
    expect(weekdayAverages(lines, 'expense', october, 7, ctx).map((d) => d.weekday)).toEqual([7, 1, 2, 3, 4, 5, 6]);
  });
  it('stops counting at today so future days do not dilute', () => {
    const sat = weekdayAverages(lines, 'expense', october, 1, ctx, '2026-10-11')[5]!;
    expect(sat.occurrences).toBe(2);
    expect(sat.average).toBe(4000);
  });
  it('finds the peak', () => {
    expect(peakIndex([0, 5, 9, 9])).toBe(2);
    expect(peakIndex([0, 0])).toBeNull();
  });
});

describe('topTitles', () => {
  const lines = [
    line('2026-10-01', 400, { title: 'Swiggy', transactionId: 't1' }),
    line('2026-10-02', 600, { title: ' swiggy ', transactionId: 't2', categoryId: 'food' }),
    line('2026-10-03', 100, { title: 'Uber', transactionId: 't3', categoryId: 'travel' }),
    line('2026-10-03', 50, { title: '', transactionId: 't4' }),
    line('2026-10-04', 70, { title: 'Swiggy', transactionId: 't5', currency: 'USD' }),
    line('2026-09-30', 9999, { title: 'Swiggy', transactionId: 't6' }),
  ];
  it('groups by normalised title and ranks by total', () => {
    const out = topTitles(lines, 'expense', october, ctx, 5);
    expect(out.map((t) => [t.key, t.amount, t.count])).toEqual([
      ['swiggy', 400 + 600 + 5600, 3],
      ['uber', 100, 1],
    ]);
    expect(out[0]?.title).toBe('Swiggy');
    expect(out[0]?.percent).toBe(98);
  });
  it('counts a split transaction once and keeps its biggest category', () => {
    const split = [
      line('2026-10-01', 300, { title: 'Costco', transactionId: 's', categoryId: 'home' }),
      line('2026-10-01', 700, { title: 'Costco', transactionId: 's', categoryId: 'food' }),
    ];
    const [top] = topTitles(split, 'expense', october, ctx);
    expect(top).toMatchObject({ amount: 1000, count: 1, categoryId: 'food' });
  });
  it('limits the list', () => {
    expect(topTitles(lines, 'expense', october, ctx, 1)).toHaveLength(1);
    expect(normaliseTitle('  A   B ')).toBe('a b');
  });
});

describe('byAccount', () => {
  it('sums per account in display currency', () => {
    const out = byAccount(
      [line('2026-10-01', 300, { accountId: 'x' }), line('2026-10-02', 100, { accountId: 'y', currency: 'USD' }), line('2026-10-02', 100, { accountId: 'x', kind: 'income' })],
      'expense',
      october,
      ctx,
    );
    expect(out).toEqual([
      { accountId: 'y', amount: 8000, percent: 96 },
      { accountId: 'x', amount: 300, percent: 4 },
    ]);
  });
});

describe('biggest', () => {
  it('folds split lines back into one transaction', () => {
    const lines = [
      line('2026-10-01', 600, { transactionId: 'split', title: 'Costco', categoryId: 'food' }),
      line('2026-10-01', 600, { transactionId: 'split', title: 'Costco', categoryId: 'home' }),
      line('2026-10-02', 1000, { transactionId: 'plain', title: 'Rent' }),
    ];
    expect(biggest(lines, 'expense', october, ctx)).toMatchObject({ transactionId: 'split', amount: 1200 });
    expect(transactionTotals(lines, 'expense', october, ctx)).toHaveLength(2);
    expect(biggest([], 'expense', october, ctx)).toBeNull();
  });
});

describe('savingsRate and dailyAverage', () => {
  it('computes the rate and hides it without income', () => {
    expect(savingsRate(10000, 4000)).toBe(60);
    expect(savingsRate(10000, 12000)).toBe(-20);
    expect(savingsRate(0, 500)).toBeNull();
  });
  it('averages per elapsed day', () => {
    expect(dailyAverage(3100, october)).toBe(100);
    expect(dailyAverage(500, october, '2026-10-05')).toBe(100);
    expect(dailyAverage(500, october, '2026-11-20')).toBe(16);
  });
});

describe('pairedMonthly', () => {
  const lines = [
    line('2026-10-02', 500),
    line('2026-10-03', 9000, { kind: 'income' }),
    line('2026-09-30', 200),
    line('2026-05-01', 100),
    line('2026-04-30', 999),
  ];
  it('returns six months ending at the reference month, oldest first', () => {
    const out = pairedMonthly(lines, '2026-10-20', { weekStart: 1, monthStart: 1 }, ctx);
    expect(out.map((m) => m.key)).toEqual(['2026-05-01', '2026-06-01', '2026-07-01', '2026-08-01', '2026-09-01', '2026-10-01']);
    expect(out[5]).toMatchObject({ income: 9000, spent: 500 });
    expect(out[4]).toMatchObject({ income: 0, spent: 200 });
    expect(out[0]?.spent).toBe(100);
  });
});
