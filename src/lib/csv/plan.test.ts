import { DIME_SAMPLE, FARTHING_SAMPLE } from './fixtures';
import { parseDime, parseFarthing, type ImportRow } from './import';
import { dedupeKey, importSummary, planImport, type ExistingData } from './plan';
import { toDateKey } from '@/lib/dates';

const empty: ExistingData = { accounts: [], categories: [], ids: new Set(), keys: new Map() };
const defaults = { displayCurrency: 'USD', defaultAccountId: null };

const row = (patch: Partial<ImportRow> = {}): ImportRow => ({
  kind: 'expense',
  occurredAt: new Date(2024, 0, 5, 10, 0).getTime(),
  title: 'Coffee',
  memo: '',
  amount: '4.50',
  currency: null,
  category: 'Food',
  account: null,
  transferAccount: null,
  transferAmount: null,
  splits: [],
  ...patch,
});

describe('planImport', () => {
  it('plans new categories and one default account in the display currency', () => {
    const plan = planImport(parseDime(DIME_SAMPLE).rows, empty, { displayCurrency: 'INR', defaultAccountId: null });
    expect(plan.stats).toMatchObject({ transactions: 9, categories: 8, newCategories: 8, accounts: 1, newAccounts: 1, duplicates: 0 });
    expect(plan.newAccounts).toEqual([{ key: 'cash', name: 'Cash', currency: 'INR' }]);
    expect(plan.transactions[0]).toMatchObject({ amount: 7030, kind: 'expense', accountKey: 'cash' });
  });

  it('matches existing categories and accounts case-insensitively', () => {
    const existing: ExistingData = {
      ...empty,
      accounts: [{ id: 'a1', name: 'Main', currency: 'EUR' }],
      categories: [{ id: 'c1', name: 'food', kind: 'expense' }],
    };
    const plan = planImport([row({ account: 'MAIN', category: 'Food', currency: 'USD' })], existing, defaults);
    expect(plan.stats).toMatchObject({ newCategories: 0, newAccounts: 0, categories: 1, accounts: 1 });
    expect(plan.transactions[0]).toMatchObject({ currency: 'EUR', accountKey: 'main', categoryKey: 'expense:food' });
  });

  it('falls back to the default account and to Other categories', () => {
    const existing: ExistingData = { ...empty, accounts: [{ id: 'a1', name: 'Wallet', currency: 'JPY' }, { id: 'a2', name: 'Bank', currency: 'JPY' }] };
    const plan = planImport([row({ category: '  ', amount: '500' }), row({ kind: 'income', category: '', title: '' })], existing, {
      displayCurrency: 'USD',
      defaultAccountId: 'a2',
    });
    expect(plan.transactions.map((t) => [t.accountKey, t.categoryKey, t.title])).toEqual([
      ['bank', 'expense:other', 'Coffee'],
      ['bank', 'income:other income', 'Other income'],
    ]);
  });

  it('uses the file currency for new accounts when it is a known code', () => {
    const plan = planImport([row({ account: 'Wise', currency: 'EUR' }), row({ account: 'Odd', currency: 'XYZ' })], empty, defaults);
    expect(plan.newAccounts.map((a) => a.currency)).toEqual(['EUR', 'USD']);
  });

  it('drops duplicates by date, amount and title, consuming one stored match per row', () => {
    const key = dedupeKey(toDateKey(row().occurredAt), 450, 'coffee');
    const existing: ExistingData = { ...empty, keys: new Map([[key, 2]]) };
    const plan = planImport([row(), row(), row(), row({ title: 'Tea' })], existing, defaults);
    expect(plan.stats.transactions).toBe(2);
    expect(plan.stats.duplicates).toBe(2);
  });

  it('skips rows with bad amounts and same-account transfers', () => {
    const plan = planImport(
      [row({ amount: 'x' }), row({ kind: 'transfer', account: 'A', transferAccount: 'a' }), row({ kind: 'transfer', account: 'A', transferAccount: null })],
      empty,
      defaults,
    );
    expect(plan.stats).toMatchObject({ transactions: 0, skipped: 3, newAccounts: 0 });
  });

  it('plans splits and transfers from a Farthing file', () => {
    const plan = planImport(parseFarthing(FARTHING_SAMPLE).rows, empty, defaults);
    const split = plan.transactions.find((t) => t.id === 'a2');
    expect(split?.splits.map((s) => s.amount)).toEqual([6000, 2640]);
    const transfer = plan.transactions.find((t) => t.kind === 'transfer');
    expect(transfer).toMatchObject({ amount: 50000, transferAmount: 50000, transferAccountKey: 'savings' });
    expect(plan.newAccounts.map((a) => a.name)).toEqual(['Main', 'Savings']);
  });
});

describe('importSummary', () => {
  it('formats the preview line', () => {
    expect(importSummary({ transactions: 312, categories: 14, newCategories: 3, accounts: 2 })).toBe('312 transactions, 14 categories (3 new), 2 accounts');
    expect(importSummary({ transactions: 1, categories: 1, newCategories: 0, accounts: 1 })).toBe('1 transaction, 1 category, 1 account');
  });
});
