import { buildExportCsv, parseFarthing, parseImport, type ExportRecord } from '@/lib/csv';
import { CASHEW_SAMPLE, DIME_SAMPLE, FARTHING_SAMPLE } from '@/lib/csv/fixtures';
import { toDateKey } from '@/lib/dates';
import { createAccount, listAccounts } from './accounts';
import { listCategories } from './categories';
import { createTransaction, listForPeriod } from './transactions';
import { importTransactions, listForExport } from './importer';
import { categoryId, createTestDb, makeAccounts, type TestDb } from '../test-helpers';
import { transactions } from '../schema';

const defaults = { displayCurrency: 'USD', defaultAccountId: null };

function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('importTransactions', () => {
  it('imports a Dime file, creating tag.fill categories with palette colours and a default account', () => {
    const db = createTestDb();
    const before = listCategories(db).length;
    const result = importTransactions(db, parseImport('dime', DIME_SAMPLE).rows, defaults);
    expect(result).toMatchObject({ imported: 9, newCategories: 4, categories: 8, newAccounts: 1 });
    expect(listCategories(db).length).toBe(before + 4);
    const created = listCategories(db).filter((c) => c.icon === 'tag.fill');
    expect(created).toHaveLength(4);
    expect(created.every((c) => c.color !== 'gray')).toBe(true);
    expect(listAccounts(db)).toHaveLength(1);
    expect(db.select().from(transactions).all()).toHaveLength(9);
  });

  it('imports Cashew accounts in their currency and skips a second identical import', () => {
    const db = createTestDb();
    const rows = parseImport('cashew', CASHEW_SAMPLE).rows;
    expect(importTransactions(db, rows, defaults).imported).toBe(4);
    expect(listAccounts(db).map((a) => [a.name, a.currency])).toEqual([['Main', 'USD'], ['Savings', 'USD']]);
    const again = importTransactions(db, rows, defaults);
    expect(again).toMatchObject({ imported: 0, duplicates: 4, newCategories: 0, newAccounts: 0 });
    expect(db.select().from(transactions).all()).toHaveLength(4);
  });

  it('keeps a same-name, different-currency account separate and stores each amount in its own currency', () => {
    const db = createTestDb();
    createAccount(db, { name: 'Cash', type: 'cash', currency: 'USD', color: 'blue' });
    const rows = parseImport('dime', DIME_SAMPLE).rows.slice(0, 2).map((r) => ({ ...r, account: 'Cash', currency: 'INR' }));
    importTransactions(db, rows, defaults);
    const list = listAccounts(db);
    expect(list.map((a) => a.name + ':' + a.currency).sort()).toEqual(['Cash (INR):INR', 'Cash:USD']);
    const inr = list.find((a) => a.currency === 'INR');
    const stored = db.select().from(transactions).all();
    expect(stored).toHaveLength(2);
    expect(stored.every((t) => t.accountId === inr?.id && t.currency === 'INR')).toBe(true);
  });

  it('writes in a single transaction: a failure rolls everything back', () => {
    const db = createTestDb();
    const cats = listCategories(db).length;
    const failing = {
      transaction: (fn: (tx: unknown) => unknown) =>
        db.transaction((tx) => {
          fn(tx);
          throw new Error('boom');
        }),
    } as unknown as TestDb;
    expect(() => importTransactions(failing, parseFarthing(FARTHING_SAMPLE).rows, defaults)).toThrow('boom');
    expect(listAccounts(db)).toHaveLength(0);
    expect(listCategories(db)).toHaveLength(cats);
    expect(db.select().from(transactions).all()).toHaveLength(0);
  });
});

describe('export and import round trip', () => {
  it('re-imports 1,000 exported rows losslessly into an empty database', () => {
    const source = createTestDb();
    const { cash, bank, usd } = makeAccounts(source);
    const random = rng(42);
    const expense = listCategories(source, 'expense');
    const income = listCategories(source, 'income');
    const pick = <T,>(items: readonly T[]) => items[Math.floor(random() * items.length)] as T;
    const titles = ['Coffee', 'Lunch, with "friends"', 'Rent', 'Taxi\nhome', 'Café ☕', ''];
    const base = new Date(2023, 0, 1, 0, 0).getTime();

    for (let i = 0; i < 1000; i++) {
      const occurredAt = base + Math.floor(random() * 540) * 86_400_000 + Math.floor(random() * 24 * 60) * 60_000;
      const account = pick([cash, bank, usd]);
      const roll = random();
      const amount = 100 + Math.floor(random() * 500_000);
      const common = { occurredAt, title: pick(titles), memo: random() < 0.2 ? 'note, with comma' : '', accountId: account.id };
      if (roll < 0.07) {
        const other = pick([cash, bank, usd].filter((a) => a.id !== account.id));
        createTransaction(source, {
          ...common,
          kind: 'transfer',
          amount,
          transferAccountId: other.id,
          transferAmount: other.currency === account.currency ? amount : Math.floor(amount / 80) + 1,
        });
      } else if (roll < 0.17) {
        const a = Math.floor(amount / 3) + 1;
        createTransaction(source, {
          ...common,
          kind: 'expense',
          amount: a + (amount - a) + 1,
          splits: [
            { categoryId: pick(expense).id, amount: a },
            { categoryId: pick(expense).id, amount: amount - a + 1 },
          ],
        });
      } else if (roll < 0.3) {
        createTransaction(source, { ...common, kind: 'income', amount, categoryId: pick(income).id });
      } else {
        createTransaction(source, { ...common, kind: 'expense', amount, categoryId: pick(expense).id });
      }
    }

    const records: ExportRecord[] = listForExport(source);
    expect(records).toHaveLength(1000);
    const text = buildExportCsv(records);
    expect(text.startsWith('﻿date,time,kind,title,memo,amount,currency,category,account,transfer_account,transfer_amount,split_index,split_count,id\r\n')).toBe(true);

    const target = createTestDb();
    const parsed = parseFarthing(text);
    expect(parsed.skipped).toBe(0);
    const result = importTransactions(target, parsed.rows, defaults);
    expect(result).toMatchObject({ imported: 1000, duplicates: 0, skipped: 0, newAccounts: 3 });
    expect(result.newCategories).toBe(0);

    const again = buildExportCsv(listForExport(target));
    expect(again).toBe(text);

    // Re-importing the same file is a no-op.
    expect(importTransactions(target, parsed.rows, defaults).imported).toBe(0);
    expect(listAccounts(target).map((a) => a.currency).sort()).toEqual(['INR', 'INR', 'USD']);
    expect(listForPeriod(target, { from: '2000-01-01', to: toDateKey(Date.now()) })).toHaveLength(1000);
  });

  it('filters by date and account', () => {
    const db = createTestDb();
    const { cash, bank } = makeAccounts(db);
    const food = categoryId(db, 'Groceries');
    const make = (accountId: string, day: number) =>
      createTransaction(db, { kind: 'expense', amount: 100, accountId, categoryId: food, occurredAt: new Date(2024, 0, day, 12).getTime() });
    make(cash.id, 1);
    make(cash.id, 10);
    make(bank.id, 10);
    expect(listForExport(db, { from: '2024-01-05' })).toHaveLength(2);
    expect(listForExport(db, { accountIds: [bank.id] })).toHaveLength(1);
    expect(listForExport(db, { from: '2024-02-01' })).toEqual([]);
    createAccount(db, { name: 'Extra', type: 'cash', currency: 'INR', color: 'red' });
  });
});
