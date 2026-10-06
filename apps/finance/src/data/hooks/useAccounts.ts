import { listAccountsWithBalances, type AccountWithBalance } from '@/db/repos/accounts';
import { useLiveData } from '../use-live-data';

export type { AccountWithBalance };

/** Accounts with balances in each account's own currency. */
export function useAccounts(options: { includeArchived?: boolean } = {}): AccountWithBalance[] {
  const includeArchived = options.includeArchived ?? false;
  return useLiveData(['accounts', 'transactions'], String(includeArchived), (db) =>
    listAccountsWithBalances(db, { includeArchived }),
  );
}
