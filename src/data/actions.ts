import { useMemo } from 'react';
import * as accounts from '@/db/repos/accounts';
import * as budgets from '@/db/repos/budgets';
import * as categories from '@/db/repos/categories';
import * as fx from '@/db/repos/fx';
import * as recurring from '@/db/repos/recurring';
import * as settings from '@/db/repos/settings';
import * as transactions from '@/db/repos/transactions';
import { useDb } from '@/db/context';
import type { Db } from '@/db/types';
import { notifyChange } from './changes';

type Write<A extends unknown[], R> = (...args: A) => R;

/** Binds a repository write to `db` and refreshes live hooks once it returns. */
function bind(db: Db) {
  return <A extends unknown[], R>(fn: (db: Db, ...args: A) => R): Write<A, R> =>
    (...args) => {
      const result = fn(db, ...args);
      notifyChange();
      return result;
    };
}

export function createActions(db: Db) {
  const write = bind(db);
  return {
    accounts: {
      create: write(accounts.createAccount),
      update: write(accounts.updateAccount),
      archive: write(accounts.archiveAccount),
      unarchive: write(accounts.unarchiveAccount),
      setDefault: write(accounts.setDefaultAccount),
      reorder: write(accounts.reorderAccounts),
      delete: write(accounts.deleteAccount),
    },
    categories: {
      create: write(categories.createCategory),
      update: write(categories.updateCategory),
      archive: write(categories.archiveCategory),
      reorder: write(categories.reorderCategories),
      delete: write(categories.deleteCategory),
    },
    transactions: {
      create: write(transactions.createTransaction),
      update: write(transactions.updateTransaction),
      delete: write(transactions.deleteTransaction),
      restore: write(transactions.restoreTransaction),
    },
    budgets: {
      create: write(budgets.createBudget),
      update: write(budgets.updateBudget),
      archive: write(budgets.archiveBudget),
      delete: write(budgets.deleteBudget),
    },
    recurring: {
      create: write(recurring.createRule),
      update: write(recurring.updateRule),
      setPaused: write(recurring.setRulePaused),
      delete: write(recurring.deleteRule),
      postDue: write(recurring.postDue),
      postNow: write(recurring.postNow),
      skip: write(recurring.skip),
    },
    settings: {
      set: write(settings.setSetting),
    },
    fx: {
      setRate: write(fx.setRate),
      deleteRate: write(fx.deleteRate),
    },
  };
}

export type Actions = ReturnType<typeof createActions>;

/** Write functions bound to the app database; each one refreshes the live hooks. */
export function useActions(): Actions {
  const db = useDb();
  return useMemo(() => createActions(db), [db]);
}
