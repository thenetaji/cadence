import { useMemo, useSyncExternalStore } from 'react';
import { useDb } from './context';
import { subscribeToChanges, versionOf, type TableName } from './changes';

/**
 * Runs a synchronous read against the database and re-runs it whenever one of
 * `tables` changes or `key` (a stable string describing the read's inputs) changes.
 * `Db` is the app's database type; apps re-export this with it bound (see Finance's `@/data/use-live-data`).
 */
export function useLiveData<Db, T>(tables: readonly TableName[], key: string, read: (db: Db) => T): T {
  const db = useDb<Db>();
  const version = useSyncExternalStore(
    subscribeToChanges,
    () => versionOf(tables),
    () => versionOf(tables),
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` encodes every input of `read`
  return useMemo(() => read(db), [db, version, key]);
}
