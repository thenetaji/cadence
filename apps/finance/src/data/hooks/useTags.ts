import { listTags, listTagsWithTotals, type TagTotal } from '@/db/repos/tags';
import { transactionsForTag } from '@/db/repos/transactions';
import type { TagRow } from '@/db/schema';
import { useLiveData } from '@/data/use-live-data';
import type { TransactionListItem } from './useTransactions';

/** Every tag, alphabetical. */
export function useTags(): TagRow[] {
  return useLiveData(['tags'], '', listTags);
}

/** Every tag with spent/earned/count for the period (display currency), biggest spend first. */
export function useTagTotals(period: { from: string; to: string }): TagTotal[] {
  return useLiveData(['tags', 'transaction_tags', 'transactions', 'fx_rates', 'settings'], `${period.from}:${period.to}`, (db) => listTagsWithTotals(db, period));
}

/** Transactions carrying the tag, newest first; all time unless a period is given. */
export function useTagTransactions(tagId: string | undefined, period?: { from: string; to: string }): TransactionListItem[] {
  return useLiveData(
    ['tags', 'transaction_tags', 'transactions', 'transaction_splits', 'accounts', 'categories', 'people', 'attachments'],
    `${tagId ?? ''}:${period?.from ?? ''}:${period?.to ?? ''}`,
    (db) => (tagId ? transactionsForTag(db, tagId, period) : []),
  );
}
