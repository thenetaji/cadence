/** @jest-environment node */
import { periodFor } from '@/lib/dates';
import { createRule, postDue } from '@/db/repos/recurring';
import { setRate } from '@/db/repos/fx';
import { setSetting } from '@/db/repos/settings';
import { createTransaction } from '@/db/repos/transactions';
import { at, categoryId, createTestDb, makeAccounts } from '@/db/test-helpers';
import { notifyChange, subscribeToChanges, versionOf } from './changes';
import { readInsights } from './hooks/insights';
import { readPeriodSummary } from './hooks/summary';
import { createActions } from './actions';

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('change notifications', () => {
  it('coalesces notifications in one tick and bumps only the touched tables', async () => {
    const calls = jest.fn();
    const unsubscribe = subscribeToChanges(calls);
    const before = { accounts: versionOf(['accounts']), settings: versionOf(['settings']) };
    notifyChange(['accounts']);
    notifyChange(['accounts', 'settings']);
    expect(calls).not.toHaveBeenCalled();
    await tick();
    expect(calls).toHaveBeenCalledTimes(1);
    expect(versionOf(['accounts'])).toBe(before.accounts + 1);
    expect(versionOf(['settings'])).toBe(before.settings + 1);
    unsubscribe();
    notifyChange();
    await tick();
    expect(calls).toHaveBeenCalledTimes(1);
  });

  it('refreshes subscribers after a bound write', async () => {
    const db = createTestDb();
    const { cash } = makeAccounts(db);
    const actions = createActions(db);
    const calls = jest.fn();
    const unsubscribe = subscribeToChanges(calls);
    const version = versionOf(['transactions']);
    actions.transactions.create({ kind: 'expense', amount: 100, accountId: cash.id, categoryId: categoryId(db, 'Groceries'), occurredAt: at('2026-10-01') });
    await tick();
    expect(calls).toHaveBeenCalledTimes(1);
    expect(versionOf(['transactions'])).toBe(version + 1);
    unsubscribe();
  });
});

describe('period summary and insights', () => {
  const setup = () => {
    const db = createTestDb();
    const accts = makeAccounts(db);
    setSetting(db, 'display_currency', 'INR');
    setRate(db, 'USD', 'INR', 80);
    const food = categoryId(db, 'Food & Drink');
    const shop = categoryId(db, 'Shopping');
    const add = (key: string, amount: number, category: string, accountId = accts.cash.id) =>
      createTransaction(db, { kind: 'expense', amount, accountId, categoryId: category, occurredAt: at(key) });
    return { db, ...accts, food, shop, add };
  };

  it('summarises spent and earned in the display currency, excluding transfers', () => {
    const { db, cash, bank, usd, food, add } = setup();
    add('2026-10-02', 10000, food);
    add('2026-10-03', 100, food, usd.id);
    createTransaction(db, { kind: 'income', amount: 500000, accountId: bank.id, categoryId: categoryId(db, 'Salary'), occurredAt: at('2026-10-01') });
    createTransaction(db, { kind: 'transfer', amount: 99999, accountId: bank.id, transferAccountId: cash.id, occurredAt: at('2026-10-04') });
    expect(readPeriodSummary(db, { from: '2026-10-01', to: '2026-10-31' })).toEqual({ currency: 'INR', spent: 18000, earned: 500000 });
  });

  it('builds categories, a top-8 donut with Other, series and delta', () => {
    const { db, cash, add } = setup();
    const expenseCategories = ['Food & Drink', 'Groceries', 'Transport', 'Shopping', 'Housing', 'Bills', 'Subscriptions', 'Health', 'Entertainment', 'Travel'];
    expenseCategories.forEach((name, i) => add('2026-10-10', (10 - i) * 1000, categoryId(db, name)));
    add('2026-09-10', 20000, categoryId(db, 'Groceries'));
    createTransaction(db, { kind: 'expense', amount: 3000, accountId: cash.id, occurredAt: at('2026-10-11'), splits: [{ categoryId: categoryId(db, 'Education'), amount: 1000 }, { categoryId: categoryId(db, 'Groceries'), amount: 2000 }] });

    const insights = readInsights(db, periodFor('month', '2026-10-15'), 'expense');
    expect(insights.total).toBe(58000);
    expect(insights.previousTotal).toBe(20000);
    expect(insights.delta).toEqual({ amount: 38000, percent: 190 });
    expect(insights.categories[0]?.category?.name).toBe('Groceries');
    expect(insights.categories[0]?.amount).toBe(9000 + 2000);
    expect(insights.categories.find((c) => c.category?.name === 'Education')?.amount).toBe(1000);
    expect(insights.donut).toHaveLength(9);
    expect(insights.donut[8]).toMatchObject({ isOther: true, category: null });
    expect(insights.donut.reduce((sum, g) => sum + g.amount, 0)).toBe(58000);
    expect(insights.series).toHaveLength(31);
    expect(insights.granularity).toBe('day');
    expect(insights.average).toBe(Math.round(58000 / 31));
  });

  it('works for income and empty periods', () => {
    const { db } = setup();
    const empty = readInsights(db, periodFor('year', '2026-10-15'), 'income');
    expect(empty).toMatchObject({ total: 0, categories: [], donut: [], granularity: 'month', average: 0 });
    expect(empty.series).toHaveLength(12);
    expect(empty.delta.percent).toBeNull();
  });

  it('posts due rules through bound actions', () => {
    const { db, cash } = setup();
    createRule(db, { kind: 'expense', title: 'Netflix', amount: 100, accountId: cash.id, categoryId: categoryId(db, 'Subscriptions'), frequency: 'monthly', startDate: '2026-10-01' });
    expect(createActions(db).recurring.postDue('2026-10-05').posted).toBe(1);
    expect(postDue(db, '2026-10-05').posted).toBe(0);
  });
});
