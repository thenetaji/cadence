import { toDateKey } from '@/lib/dates';
import type { TransactionKind } from '@/lib/ledger';
import { fromMinor } from '@/lib/money';

import { BOM, stringifyCsv } from './csv';

export const EXPORT_COLUMNS = [
  'date',
  'time',
  'kind',
  'title',
  'memo',
  'amount',
  'currency',
  'category',
  'account',
  'transfer_account',
  'transfer_amount',
  'split_index',
  'split_count',
  'id',
  'tags',
  'person',
] as const;

/** Tag names are joined with this in the `tags` column. */
export const TAG_SEPARATOR = ';';

export interface ExportRecord {
  id: string;
  kind: TransactionKind;
  title: string;
  memo: string;
  /** Positive minor units in `currency`. */
  amount: number;
  currency: string;
  occurredAt: number;
  category: string | null;
  account: string;
  transferAccount: string | null;
  /** Minor units in `transferCurrency`. */
  transferAmount: number | null;
  transferCurrency: string | null;
  splits: readonly { category: string; amount: number }[];
  /** Tag names. */
  tags?: readonly string[];
  /** Counterparty name of a lending kind. */
  person?: string | null;
}

const pad = (n: number) => String(n).padStart(2, '0');

export function exportTime(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** One row per split line (one row for an unsplit transaction); amounts are major units with a dot. */
export function exportRows(records: readonly ExportRecord[]): string[][] {
  const rows: string[][] = [[...EXPORT_COLUMNS]];
  for (const r of records) {
    const lines = r.splits.length > 0 ? r.splits : [{ category: r.category ?? '', amount: r.amount }];
    lines.forEach((line, index) => {
      rows.push([
        toDateKey(r.occurredAt),
        exportTime(r.occurredAt),
        r.kind,
        r.title,
        r.memo,
        fromMinor(line.amount, r.currency),
        r.currency,
        r.kind === 'transfer' ? '' : line.category,
        r.account,
        r.transferAccount ?? '',
        r.transferAmount === null ? '' : fromMinor(r.transferAmount, r.transferCurrency ?? r.currency),
        String(index + 1),
        String(lines.length),
        r.id,
        (r.tags ?? []).map((t) => t.replaceAll(TAG_SEPARATOR, ',')).join(TAG_SEPARATOR),
        r.person ?? '',
      ]);
    });
  }
  return rows;
}

/** The full file contents: UTF-8 BOM followed by RFC 4180 CSV. */
export function buildExportCsv(records: readonly ExportRecord[]): string {
  return `${BOM}${stringifyCsv(exportRows(records))}\r\n`;
}
