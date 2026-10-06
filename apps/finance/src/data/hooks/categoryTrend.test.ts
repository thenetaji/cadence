/** @jest-environment node */
import { createTransaction } from '@/db/repos/transactions';
import { at, categoryId, createTestDb, makeAccounts } from '@/db/test-helpers';
import { periodFor } from '@/lib/dates';
import { readCategoryTrend, trailingPeriods } from './categoryTrend';

describe('trailingPeriods', () => {
  it('returns the periods ending at the given one, oldest first', () => {
    const periods = trailingPeriods(periodFor('month', '2026-10-05'), 6);
    expect(periods.map((p) => p.from)).toEqual(['2026-05-01', '2026-06-01', '2026-07-01', '2026-08-01', '2026-09-01', '2026-10-01']);
  });
});

describe('readCategoryTrend', () => {
  it('sums the category per period, attributing split lines and ignoring transfers and other categories', () => {
    const db = createTestDb();
    const { cash, bank } = makeAccounts(db);
    const food = categoryId(db, 'Food & Drink');
    const groceries = categoryId(db, 'Groceries');
    const base = { kind: 'expense' as const, accountId: cash.id };
    createTransaction(db, { ...base, amount: 1000, categoryId: groceries, occurredAt: at('2026-10-02') });
    createTransaction(db, { ...base, amount: 4000, categoryId: groceries, occurredAt: at('2026-09-10') });
    createTransaction(db, { ...base, amount: 300, categoryId: food, occurredAt: at('2026-10-03') });
    createTransaction(db, {
      ...base,
      amount: 900,
      splits: [
        { categoryId: groceries, amount: 600 },
        { categoryId: food, amount: 300 },
      ],
      occurredAt: at('2026-10-04'),
    });
    createTransaction(db, { kind: 'transfer', amount: 5000, accountId: cash.id, transferAccountId: bank.id, occurredAt: at('2026-10-05') });
    const trend = readCategoryTrend(db, groceries, periodFor('month', '2026-10-05'), 'expense');
    expect(trend.points.map((p) => p.amount)).toEqual([0, 0, 0, 0, 4000, 1600]);
    expect(trend.average).toBe(Math.round(5600 / 6));
    expect(trend.category?.name).toBe('Groceries');
  });
});
