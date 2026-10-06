import { notifyChange as notify, registerTables } from '@studio/data';

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

registerTables(ALL_TABLES);

export { subscribeToChanges, versionOf } from '@studio/data';

/** Marks Finance tables as changed (all of them when omitted); see `notifyChange` in @studio/data. */
export function notifyChange(tables: readonly TableName[] = ALL_TABLES): void {
  notify(tables);
}
