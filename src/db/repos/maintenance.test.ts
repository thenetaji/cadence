import { count } from 'drizzle-orm';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';
import { createAccount } from './accounts';
import { createBudget } from './budgets';
import { listCategories } from './categories';
import { setRate } from './fx';
import { eraseAllData } from './maintenance';
import { getAllSettings, DEFAULT_SETTINGS, setSetting } from './settings';
import { createTransaction } from './transactions';
import { accounts, budgets, categories, fxRates, titleMemory, transactions } from '../schema';
import { categoryId, createTestDb } from '../test-helpers';

describe('eraseAllData', () => {
  it('deletes every row, resets settings but keeps the theme, and re-seeds categories', () => {
    const db = createTestDb();
    const account = createAccount(db, { name: 'Cash', type: 'cash', currency: 'USD', color: 'blue', isDefault: true });
    createTransaction(db, { kind: 'expense', amount: 500, accountId: account.id, categoryId: categoryId(db, 'Groceries'), title: 'Milk', occurredAt: Date.now() });
    createBudget(db, { name: 'Food', amount: 1000, currency: 'USD', period: 'monthly', startAnchor: 1, scope: 'all' });
    setRate(db, 'EUR', 'USD', 1.1);
    setSetting(db, 'theme', 'dark');
    setSetting(db, 'haptics', false);
    setSetting(db, 'onboarding_done', true);
    setSetting(db, 'lock_enabled', true);
    setSetting(db, 'default_account_id', account.id);

    eraseAllData(db);

    const n = (table: SQLiteTable) => db.select({ n: count() }).from(table).get()?.n;
    expect(n(transactions)).toBe(0);
    expect(n(accounts)).toBe(0);
    expect(n(budgets)).toBe(0);
    expect(n(fxRates)).toBe(0);
    expect(n(titleMemory)).toBe(0);
    expect(n(categories)).toBe(19);
    expect(listCategories(db, 'expense')).toHaveLength(13);
    expect(getAllSettings(db)).toEqual({ ...DEFAULT_SETTINGS, theme: 'dark', schema_seeded: true });
  });
});
