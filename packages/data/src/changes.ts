/** Table names are strings; each app registers its own set with `registerTables`. */
export type TableName = string;

let allTables: readonly TableName[] = [];

/** The tables `notifyChange()` marks when called without arguments (every table the app owns). */
export function registerTables(tables: readonly TableName[]): void {
  allTables = tables;
  for (const table of tables) if (!versions.has(table)) versions.set(table, 0);
}

export function getAllTables(): readonly TableName[] {
  return allTables;
}

const versions = new Map<string, number>();
const listeners = new Set<() => void>();
const pending = new Set<string>();
let scheduled = false;

function flush(): void {
  scheduled = false;
  for (const table of pending) versions.set(table, (versions.get(table) ?? 0) + 1);
  pending.clear();
  for (const listener of [...listeners]) listener();
}

/**
 * Marks tables as changed (all of them when omitted). Calls within one tick are
 * coalesced into a single refresh. Writes go through `useActions`, which calls
 * this once per write; SQLite's per-row change listener is deliberately unused
 * because bulk writes would trigger one refresh per row.
 */
export function notifyChange(tables: readonly string[] = allTables): void {
  for (const table of tables) pending.add(table);
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(flush);
}

export function subscribeToChanges(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Monotonic number that changes whenever any of `tables` changes. */
export function versionOf(tables: readonly TableName[]): number {
  let sum = 0;
  for (const table of tables) sum += versions.get(table) ?? 0;
  return sum;
}
