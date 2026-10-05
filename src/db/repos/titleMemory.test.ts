/** @jest-environment node */
import { at, categoryId, createTestDb, makeAccounts } from '../test-helpers';
import { createTransaction } from './transactions';
import { normalizeTitle, recordTitle, suggest } from './titleMemory';

describe('title memory', () => {
  it('normalises titles', () => {
    expect(normalizeTitle('  Swiggy   ORDER ')).toBe('swiggy order');
  });

  it('upserts on save, bumping use_count and remembering the last category, account and amount', () => {
    const db = createTestDb();
    const { cash, bank } = makeAccounts(db);
    const save = (title: string, accountId: string, category: string, amount: number, day: number) =>
      createTransaction(db, { kind: 'expense', title, amount, accountId, categoryId: categoryId(db, category), occurredAt: at(`2026-10-0${day}`) }, day * 1000);
    save('Swiggy', cash.id, 'Food & Drink', 34000, 1);
    save('  swiggy ', bank.id, 'Groceries', 45000, 2);
    const [hit] = suggest(db, 'swi', 'expense');
    expect(hit).toMatchObject({ title: 'swiggy', useCount: 2, accountId: bank.id, lastAmount: 45000, lastCurrency: 'INR', categoryId: categoryId(db, 'Groceries') });
  });

  it('does not remember blank titles or transfers', () => {
    const db = createTestDb();
    const { cash, bank } = makeAccounts(db);
    createTransaction(db, { kind: 'expense', amount: 100, accountId: cash.id, categoryId: categoryId(db, 'Groceries'), occurredAt: at('2026-10-01') });
    createTransaction(db, { kind: 'transfer', title: 'move', amount: 100, accountId: cash.id, transferAccountId: bank.id, occurredAt: at('2026-10-01') });
    expect(suggest(db, 'g', 'expense')).toEqual([]);
    expect(suggest(db, 'move', 'expense')).toEqual([]);
  });

  it('ranks prefix matches before substring matches, then by use count and recency, top 4', () => {
    const db = createTestDb();
    const base = { kind: 'expense' as const, categoryId: null, accountId: null, amount: 100, currency: 'INR' };
    const rec = (title: string, uses: number, lastUsed: number) => {
      for (let i = 0; i < uses; i++) recordTitle(db, { ...base, title, now: i === uses - 1 ? lastUsed : 1 });
    };
    rec('Zomato gold', 9, 100);
    rec('Gold gym', 5, 200);
    rec('Gold coast', 2, 300);
    rec('Gold loan', 2, 500);
    rec('Goldfish', 1, 900);
    rec('Old gold', 20, 50);
    recordTitle(db, { ...base, title: 'Gold salary', kind: 'income', now: 1 });
    expect(suggest(db, 'gold', 'expense').map((r) => r.title)).toEqual(['Gold gym', 'Gold loan', 'Gold coast', 'Goldfish']);
    expect(suggest(db, 'gold', 'income').map((r) => r.title)).toEqual(['Gold salary']);
    expect(suggest(db, 'ol', 'expense').map((r) => r.title)).toEqual(['Old gold', 'Zomato gold', 'Gold gym', 'Gold loan']);
    expect(suggest(db, '   ', 'expense')).toEqual([]);
    expect(suggest(db, '100%', 'expense')).toEqual([]);
  });
});
