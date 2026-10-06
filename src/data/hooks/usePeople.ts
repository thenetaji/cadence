import {
  listPeople,
  outstandingByPerson,
  outstandingTotals,
  personHistory,
  type OutstandingTotals,
  type PersonHistory,
  type PersonOutstanding,
} from '@/db/repos/people';
import type { PersonRow } from '@/db/schema';
import { useLiveData } from '../use-live-data';

const LENDING_TABLES = ['people', 'transactions', 'fx_rates', 'settings'] as const;

export function usePeople(): PersonRow[] {
  return useLiveData(['people'], '', listPeople);
}

/** Balance per person: positive = they owe me. Settled people are hidden unless `includeSettled`. */
export function useOutstanding(options: { includeSettled?: boolean } = {}): PersonOutstanding[] {
  return useLiveData(LENDING_TABLES, String(!!options.includeSettled), (db) => outstandingByPerson(db, options));
}

/** What others owe me and what I owe others, in the display currency. */
export function useOutstandingTotals(): OutstandingTotals {
  return useLiveData(LENDING_TABLES, '', outstandingTotals);
}

/** A person's lending history (newest first, with running balance); undefined when the id is unknown. */
export function usePersonHistory(personId: string | undefined): PersonHistory | undefined {
  return useLiveData(
    [...LENDING_TABLES, 'accounts', 'categories', 'transaction_tags', 'tags', 'attachments'],
    personId ?? '',
    (db) => (personId ? personHistory(db, personId) : undefined),
  );
}
