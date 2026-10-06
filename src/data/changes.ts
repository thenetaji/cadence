export type TableName =
  | 'accounts'
  | 'categories'
  | 'transactions'
  | 'transaction_splits'
  | 'transaction_tags'
  | 'tags'
  | 'people'
  | 'attachments'
  | 'recurring_rules'
  | 'budgets'
  | 'budget_categories'
  | 'title_memory'
  | 'fx_rates'
  | 'settings';

export const ALL_TABLES: readonly TableName[] = [
  'accounts',
  'categories',
  'transactions',
  'transaction_splits',
  'transaction_tags',
  'tags',
  'people',
  'attachments',
  'recurring_rules',
  'budgets',
  'budget_categories',
  'title_memory',
  'fx_rates',
  'settings',
];

const versions = new Map<string, number>(ALL_TABLES.map((t) => [t, 0]));
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
export function notifyChange(tables: readonly string[] = ALL_TABLES): void {
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
