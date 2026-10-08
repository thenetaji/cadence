import { useLiveData as useLiveDataBase } from "@studio/data";

import type { Db } from "@/db/types";
import type { TableName } from "./changes";

/**
 * Runs a synchronous read against the database and re-runs it whenever one of
 * `tables` changes or `key` (a stable string describing the read's inputs) changes.
 */
export function useLiveData<T>(
  tables: readonly TableName[],
  key: string,
  read: (db: Db) => T,
): T {
  return useLiveDataBase<Db, T>(tables, key, read);
}
