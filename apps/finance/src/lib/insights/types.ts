import type { DateKey } from '@studio/dates';

/** One attributable amount: a plain transaction, or one split line. Transfers never appear. */
export interface FlatLine {
  dateKey: DateKey;
  kind: 'expense' | 'income';
  categoryId: string | null;
  amount: number;
  currency: string;
}
