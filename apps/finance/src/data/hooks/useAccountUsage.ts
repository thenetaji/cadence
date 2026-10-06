import { countAccountReferences } from '@/db/repos/accounts';
import { useLiveData } from '@/data/use-live-data';

/** Transactions and rules that reference the account; 0 means it can be deleted or change currency. */
export function useAccountUsage(id: string | undefined): number {
  return useLiveData(['transactions', 'recurring_rules'], id ?? '', (db) => (id ? countAccountReferences(db, id) : 0));
}
