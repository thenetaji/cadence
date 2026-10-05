import { search, type TransactionListItem } from '@/db/repos/transactions';
import { useLiveData } from '../use-live-data';

/** Title/memo/amount search across all time; at most 200 rows, newest first. */
export function useSearchTransactions(query: string): TransactionListItem[] {
  const text = query.trim();
  return useLiveData(['transactions', 'transaction_splits', 'accounts', 'categories'], text, (db) => search(db, text));
}
