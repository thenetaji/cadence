import { useMemo, useSyncExternalStore } from 'react';
import { useDb } from '@/db/context';
import type { Db } from '@/db/types';
import { subscribeToChanges, versionOf, type TableName } from './changes';

/**
 * Runs a synchronous read against the database and re-runs it whenever one of
 * `tables` changes or `key` (a stable string describing the read's inputs) changes.
 */
export function useLiveData<T>(tables: readonly TableName[], key: string, read: (db: Db) => T): T {
  const db = useDb();
  const version = useSyncExternalStore(
    subscribeToChanges,
    () => versionOf(tables),
    () => versionOf(tables),
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` encodes every input of `read`
  return useMemo(() => read(db), [db, version, key]);
}
