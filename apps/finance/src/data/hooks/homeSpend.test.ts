/** @jest-environment node */
import { createTransaction } from '@/db/repos/transactions';
import { recordTitle } from '@/db/repos/titleMemory';
import { at, categoryId, createTestDb, makeAccounts } from '@/db/test-helpers';
import { periodFor } from '@studio/dates';
import { buildHomeSpend, cumulative, percentChange, perDayAverage, readHomeSpend } from './homeSpend';
import { frequentTitles } from './useFrequentTitles';

describe('home spend maths', () => {
  it('builds cumulative sums', () => {
    expect(cumulative([1, 0, 4])).toEqual([1, 1, 5]);
    expect(cumulative([])).toEqual([]);
  });

  it('rounds percent change away from zero and skips an empty base', () => {
    expect(percentChange(88, 100)).toBe(-12);
    expect(percentChange(105, 100)).toBe(5);
    expect(percentChange(1, 0)).toBeNull();
    expect(percentChange(0, 100)).toBe(-100);
  });

  it('averages per elapsed day, half up', () => {
    expect(perDayAverage(1000, 4)).toBe(250);
    expect(perDayAverage(10, 4)).toBe(3);
    expect(perDayAverage(5, 0)).toBe(0);
  });

  it('compares against the same day last month and blanks the future', () => {
    const out = buildHomeSpend([10, 0, 20, 0, 0], [5, 5, 5, 5, 5, 5], 2);
    expect(out.series.map((p) => p.actual)).toEqual([10, 10, 30, null, null]);
    expect(out.series.map((p) => p.pace)).toEqual([5, 10, 15, 20, 25]);
    expect(out.spent).toBe(30);
    expect(out.previousSameDay).toBe(15);
    expect(out.deltaPercent).toBe(100);
    expect(out.perDay).toBe(10);
  });

  it('accumulates income alongside spend and blanks it after today', () => {
    const out = buildHomeSpend([10, 0, 20, 0], [], 2, [0, 500, 0, 900]);
    expect(out.series.map((p) => p.income)).toEqual([0, 500, 500, null]);
  });

  it('clamps pace when last month was shorter', () => {
    const out = buildHomeSpend([1, 1, 1, 1], [2, 2], 3);
    expect(out.series.map((p) => p.pace)).toEqual([2, 4, 4, 4]);
  });
});

describe('readHomeSpend', () => {
  it('reads both months from the database', () => {
    const db = createTestDb();
    const { cash } = makeAccounts(db);
    const base = { kind: 'expense' as const, accountId: cash.id, categoryId: categoryId(db, 'Groceries') };
    createTransaction(db, { ...base, amount: 1000, occurredAt: at('2026-09-02') });
    createTransaction(db, { ...base, amount: 9000, occurredAt: at('2026-09-20') });
    createTransaction(db, { ...base, amount: 500, occurredAt: at('2026-10-01') });
    createTransaction(db, { kind: 'income', accountId: cash.id, categoryId: categoryId(db, 'Salary'), amount: 7000, occurredAt: at('2026-10-02') });
    const result = readHomeSpend(db, periodFor('month', '2026-10-05'), '2026-10-05');
    expect(result.spent).toBe(500);
    expect(result.earned).toBe(7000);
    expect(result.previousSameDay).toBe(1000);
    expect(result.deltaPercent).toBe(-50);
    expect(result.dayIndex).toBe(4);
    expect(result.series).toHaveLength(31);
  });
});

describe('frequentTitles', () => {
  it('ranks by use count then recency and ignores income', () => {
    const db = createTestDb();
    const t = (title: string, now: number, kind: 'expense' | 'income' = 'expense') =>
      recordTitle(db, { title, kind, categoryId: null, accountId: null, amount: 100, currency: 'INR', now });
    t('Chai', 1);
    t('Swiggy', 2);
    t('Swiggy', 3);
    t('Metro', 5);
    t('Salary', 6, 'income');
    t('Salary', 7, 'income');
    expect(frequentTitles(db, 3).map((r) => r.title)).toEqual(['Swiggy', 'Metro', 'Chai']);
    expect(frequentTitles(db, 1)).toHaveLength(1);
  });
});
