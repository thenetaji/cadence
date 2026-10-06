/** @jest-environment node */
import { at, categoryId, createTestDb, makeAccounts } from '../test-helpers';
import { dailyTotals } from './calendar';
import { setRate } from './fx';
import { createPerson } from './people';
import { setSetting } from './settings';
import { createTransaction } from './transactions';

describe('dailyTotals', () => {
  it('gives one entry per day of the month with spend, max and total', () => {
    const db = createTestDb();
    const { cash, bank, usd } = makeAccounts(db);
    setSetting(db, 'display_currency', 'INR');
    setRate(db, 'USD', 'INR', 80);
    const food = categoryId(db, 'Food & Drink');
    const add = (day: string, amount: number, accountId = cash.id) =>
      createTransaction(db, { kind: 'expense', amount, accountId, categoryId: food, occurredAt: at(day) });
    add('2026-02-01', 1000);
    add('2026-02-01', 500);
    add('2026-02-14', 10, usd.id);
    add('2026-02-28', 250);
    add('2026-03-01', 9999);
    add('2026-01-31', 9999);
    createTransaction(db, { kind: 'income', amount: 70000, accountId: bank.id, categoryId: categoryId(db, 'Salary'), occurredAt: at('2026-02-02') });
    createTransaction(db, { kind: 'expense', amount: 300, accountId: cash.id, occurredAt: at('2026-02-20'), splits: [{ categoryId: food, amount: 100 }, { categoryId: categoryId(db, 'Other'), amount: 200 }] });

    const month = dailyTotals(db, '2026-02', 'expense');
    expect(month.month).toBe('2026-02-01');
    expect(month.currency).toBe('INR');
    expect(month.days).toHaveLength(28);
    expect(month.days[0]).toEqual({ dateKey: '2026-02-01', amount: 1500 });
    expect(month.days[13]).toEqual({ dateKey: '2026-02-14', amount: 800 });
    expect(month.days[19]).toEqual({ dateKey: '2026-02-20', amount: 300 });
    expect(month.days[27]).toEqual({ dateKey: '2026-02-28', amount: 250 });
    expect(month.days[1]?.amount).toBe(0);
    expect(month.max).toBe(1500);
    expect(month.total).toBe(1500 + 800 + 300 + 250);
    expect(month.firstWeekday).toBe(7);
    expect(dailyTotals(db, '2026-02-15', 'expense').days).toHaveLength(28);
    expect(dailyTotals(db, '2026-02', 'income')).toMatchObject({ max: 70000, total: 70000 });
  });

  it('excludes transfers and lending, and handles empty and leap months', () => {
    const db = createTestDb();
    const { cash, bank } = makeAccounts(db);
    const asha = createPerson(db, { name: 'Asha' });
    createTransaction(db, { kind: 'transfer', amount: 5000, accountId: bank.id, transferAccountId: cash.id, occurredAt: at('2028-02-10') });
    for (const kind of ['lent', 'borrowed', 'repaid_to_me', 'repaid_by_me'] as const) {
      createTransaction(db, { kind, amount: 5000, accountId: cash.id, personId: asha.id, occurredAt: at('2028-02-10') });
    }
    const month = dailyTotals(db, '2028-02', 'expense');
    expect(month.days).toHaveLength(29);
    expect(month).toMatchObject({ max: 0, total: 0, firstWeekday: 2 });
    expect(month.days.every((d) => d.amount === 0)).toBe(true);
  });
});
