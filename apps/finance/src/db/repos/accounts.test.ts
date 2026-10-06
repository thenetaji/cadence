/** @jest-environment node */
import { ValidationError } from '../errors';
import { at, categoryId, createTestDb, makeAccounts } from '../test-helpers';
import {
  archiveAccount,
  createAccount,
  deleteAccount,
  getAccount,
  listAccounts,
  reorderAccounts,
  setDefaultAccount,
  unarchiveAccount,
  updateAccount,
} from './accounts';
import { getSetting } from './settings';
import { createTransaction, getTransaction } from './transactions';

const codeOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return e instanceof ValidationError ? e.code : String(e);
  }
  return undefined;
};

describe('accounts', () => {
  it('makes the first account default and keeps one default', () => {
    const db = createTestDb();
    const { cash, bank } = makeAccounts(db);
    expect(getAccount(db, cash.id)?.isDefault).toBe(true);
    expect(getSetting(db, 'default_account_id')).toBe(cash.id);
    setDefaultAccount(db, bank.id);
    expect(listAccounts(db).filter((a) => a.isDefault).map((a) => a.name)).toEqual(['HDFC']);
    expect(getSetting(db, 'default_account_id')).toBe(bank.id);
  });

  it('assigns icons by type, sort order, and supports reorder', () => {
    const db = createTestDb();
    const { cash, bank, usd } = makeAccounts(db);
    expect(cash.icon).toBe('banknote');
    expect(bank.icon).toBe('building.columns.fill');
    reorderAccounts(db, [usd.id, cash.id, bank.id]);
    expect(listAccounts(db).map((a) => a.name)).toEqual(['Wise USD', 'Cash', 'HDFC']);
  });

  it('archives (moving the default) and unarchives', () => {
    const db = createTestDb();
    const { cash, bank } = makeAccounts(db);
    archiveAccount(db, cash.id);
    expect(listAccounts(db).map((a) => a.id)).not.toContain(cash.id);
    expect(listAccounts(db, { includeArchived: true })).toHaveLength(3);
    expect(getAccount(db, bank.id)?.isDefault).toBe(true);
    expect(getAccount(db, cash.id)?.isDefault).toBe(false);
    unarchiveAccount(db, cash.id);
    expect(listAccounts(db)).toHaveLength(3);
  });

  it('locks currency once the account has transactions', () => {
    const db = createTestDb();
    const { cash } = makeAccounts(db);
    updateAccount(db, cash.id, { currency: 'usd', name: ' Wallet ' });
    expect(getAccount(db, cash.id)).toMatchObject({ currency: 'USD', name: 'Wallet' });
    createTransaction(db, { kind: 'expense', amount: 100, accountId: cash.id, categoryId: categoryId(db, 'Groceries'), occurredAt: at('2026-10-01') });
    expect(codeOf(() => updateAccount(db, cash.id, { currency: 'INR' }))).toBe('currency_mismatch');
    updateAccount(db, cash.id, { color: 'red' });
  });

  describe('deleteAccount', () => {
    it('deletes an empty account directly', () => {
      const db = createTestDb();
      const { usd } = makeAccounts(db);
      deleteAccount(db, usd.id);
      expect(getAccount(db, usd.id)).toBeUndefined();
    });

    it('refuses without a target when transactions exist, and moves them with one', () => {
      const db = createTestDb();
      const { cash, bank } = makeAccounts(db);
      const t = createTransaction(db, { kind: 'expense', amount: 100, accountId: cash.id, categoryId: categoryId(db, 'Groceries'), occurredAt: at('2026-10-01') });
      createTransaction(db, { kind: 'transfer', amount: 500, accountId: bank.id, transferAccountId: cash.id, occurredAt: at('2026-10-02') });
      expect(codeOf(() => deleteAccount(db, cash.id))).toBe('target_required');
      expect(getAccount(db, cash.id)).toBeDefined();
      expect(codeOf(() => deleteAccount(db, cash.id, bank.id))).toBe('transfer_conflict');
      expect(getTransaction(db, t.id)?.accountId).toBe(cash.id);
    });

    it('moves transactions to the target and reassigns default', () => {
      const db = createTestDb();
      const { cash, bank, usd } = makeAccounts(db);
      const t = createTransaction(db, { kind: 'expense', amount: 100, accountId: cash.id, categoryId: categoryId(db, 'Groceries'), occurredAt: at('2026-10-01') });
      const s = createTransaction(db, { kind: 'transfer', amount: 500, transferAmount: 6, accountId: bank.id, transferAccountId: usd.id, occurredAt: at('2026-10-02') });
      expect(codeOf(() => deleteAccount(db, usd.id, cash.id))).toBe('currency_mismatch');
      deleteAccount(db, cash.id, bank.id);
      expect(getTransaction(db, t.id)?.account.name).toBe('HDFC');
      expect(getTransaction(db, s.id)?.transferAccount?.name).toBe('Wise USD');
      expect(getAccount(db, bank.id)?.isDefault).toBe(true);
      expect(getSetting(db, 'default_account_id')).toBe(bank.id);
    });
  });

  it('rejects unknown accounts', () => {
    const db = createTestDb();
    expect(codeOf(() => deleteAccount(db, 'x'))).toBe('account_not_found');
    expect(codeOf(() => updateAccount(db, 'x', { name: 'a' }))).toBe('account_not_found');
    expect(createAccount(db, { name: 'Card', type: 'card', currency: 'inr', openingBalance: -5000, color: 'red' }).currency).toBe('INR');
  });
});
