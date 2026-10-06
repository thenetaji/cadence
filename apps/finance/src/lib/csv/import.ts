import { ALL_KINDS, isLendingKind, type TransactionKind } from '@/lib/ledger';
import { fromMinor, toMinor } from '@studio/money';

import { APP_NAME } from '@/constants/app';

import { parseCsv } from './csv';

export type ImportFormat = 'native' | 'dime' | 'cashew';
export type ImportKind = TransactionKind;

/** A transaction as read from a file, before accounts, categories and currencies are resolved. Amounts are decimal text. */
export interface ImportRow {
  id?: string;
  kind: ImportKind;
  occurredAt: number;
  title: string;
  memo: string;
  /** Positive decimal text. */
  amount: string;
  currency: string | null;
  category: string;
  account: string | null;
  transferAccount: string | null;
  transferAmount: string | null;
  splits: { category: string; amount: string }[];
  /** Tag names; absent in files from older exports and other apps. */
  tags?: string[];
  /** Person name, required for the lending kinds. */
  person?: string | null;
}

export interface ParseResult {
  rows: ImportRow[];
  /** Rows that could not be read (bad date or amount). */
  skipped: number;
}

export class CsvFormatError extends Error {
  constructor(message = 'unrecognised_columns') {
    super(message);
    this.name = 'CsvFormatError';
  }
}

const DATE_TIME =
  /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?\s*(?:(Z)|([+-])(\d{2}):?(\d{2}))?)?$/i;

/**
 * Reads "2023-09-26 14:42:00 +0000" (Dime), "2024-03-05 14:32:10.000" (Cashew, local) and ISO forms.
 * Text with an offset or Z is an absolute instant; text without one is local wall-clock time.
 */
export function parseDateTime(text: string): number | null {
  const m = DATE_TIME.exec(text.trim());
  if (!m) return null;
  const [, y, mo, d, h, mi, s, z, sign, oh, om] = m;
  const year = Number(y);
  const month = Number(mo);
  const day = Number(d);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  if (h === undefined) return new Date(year, month - 1, day, 12, 0, 0).getTime();
  const hour = Number(h);
  const minute = Number(mi);
  const second = Number(s ?? 0);
  if (hour > 23 || minute > 59 || second > 59) return null;
  if (z || sign) {
    const offset = z ? 0 : (sign === '-' ? -1 : 1) * (Number(oh) * 60 + Number(om));
    return Date.UTC(year, month - 1, day, hour, minute, second) - offset * 60_000;
  }
  return new Date(year, month - 1, day, hour, minute, second).getTime();
}

type Records = Record<string, string>[];

/** Header-keyed records (header names lower-cased and trimmed); throws when a required column is missing. */
function records(text: string, required: readonly string[]): Records {
  const table = parseCsv(text);
  const header = table[0]?.map((h) => h.trim().toLowerCase());
  if (!header || !required.every((name) => header.includes(name))) throw new CsvFormatError();
  return table.slice(1).map((cells) => {
    const record: Record<string, string> = {};
    header.forEach((name, i) => {
      record[name] = (cells[i] ?? '').trim();
    });
    return record;
  });
}

/** Decimal text for an absolute amount, or null when it is not a non-zero number. */
function absoluteAmount(text: string): { text: string; negative: boolean } | null {
  const minor = toMinor(text, 'USD');
  if (minor === null || minor === 0) return null;
  const digits = text.replace(/[^\d.,-]/g, '');
  return { text: digits.replace(/^-/, ''), negative: minor < 0 };
}

export function parseDime(text: string): ParseResult {
  const rows: ImportRow[] = [];
  let skipped = 0;
  for (const r of records(text, ['date', 'note', 'amount', 'category', 'type'])) {
    const occurredAt = parseDateTime(r.date ?? '');
    const amount = absoluteAmount(r.amount ?? '');
    if (occurredAt === null || !amount) {
      skipped++;
      continue;
    }
    rows.push({
      kind: (r.type ?? '').toLowerCase() === 'income' ? 'income' : 'expense',
      occurredAt,
      title: r.note ?? '',
      memo: '',
      amount: amount.text,
      currency: null,
      category: r.category ?? '',
      account: null,
      transferAccount: null,
      transferAmount: null,
      splits: [],
    });
  }
  return { rows, skipped };
}

export function parseCashew(text: string): ParseResult {
  const rows: ImportRow[] = [];
  let skipped = 0;
  for (const r of records(text, ['amount', 'date', 'category name'])) {
    const occurredAt = parseDateTime(r.date ?? '');
    const amount = absoluteAmount(r.amount ?? '');
    if (occurredAt === null || !amount) {
      skipped++;
      continue;
    }
    const flag = (r.income ?? '').toLowerCase();
    const income = flag === 'true' || (flag !== 'false' && !amount.negative);
    const name = r.title ?? '';
    const note = r.note ?? '';
    rows.push({
      kind: income ? 'income' : 'expense',
      occurredAt,
      title: name || note,
      memo: name ? note : '',
      amount: amount.text,
      currency: r.currency ? r.currency.toUpperCase() : null,
      category: r['category name'] ?? '',
      account: r.account || null,
      transferAccount: null,
      transferAmount: null,
      splits: [],
    });
  }
  return { rows, skipped };
}

/** Splits the semicolon-separated `tags` cell, dropping blanks and case-insensitive repeats. */
export function splitTags(cell: string | undefined): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of (cell ?? '').split(';')) {
    const name = part.trim().replace(/\s+/g, ' ');
    if (name === '' || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    out.push(name);
  }
  return out;
}

function localMs(date: string, time: string): number | null {
  const m = /^(\d{2}):(\d{2})/.exec(time);
  return parseDateTime(`${date} ${m ? `${m[1]}:${m[2]}` : '12:00'}`);
}

export function parseNative(text: string): ParseResult {
  const table = records(text, ['date', 'kind', 'amount', 'currency', 'category', 'account']);
  const rows: ImportRow[] = [];
  let skipped = 0;
  for (let i = 0; i < table.length; ) {
    const first = table[i] as Record<string, string>;
    const count = Math.max(1, Number.parseInt(first.split_count ?? '1', 10) || 1);
    const group = [first];
    while (group.length < count && table[i + group.length] && table[i + group.length]?.id === first.id && first.id) {
      group.push(table[i + group.length] as Record<string, string>);
    }
    i += group.length;

    const kind = first.kind as ImportKind;
    const occurredAt = localMs(first.date ?? '', first.time ?? '');
    const currency = (first.currency ?? '').toUpperCase() || null;
    if (!ALL_KINDS.includes(kind) || occurredAt === null || group.length !== count) {
      skipped++;
      continue;
    }
    const lines = group.map((g) => ({ category: g.category ?? '', amount: g.amount ?? '' }));
    let amount = first.amount ?? '';
    if (count > 1) {
      const code = currency ?? 'USD';
      const parts = lines.map((l) => toMinor(l.amount, code));
      if (parts.some((p) => p === null)) {
        skipped++;
        continue;
      }
      amount = fromMinor(parts.reduce<number>((sum, p) => sum + (p as number), 0), code);
    }
    if (toMinor(amount, currency ?? 'USD') === null) {
      skipped++;
      continue;
    }
    rows.push({
      id: first.id || undefined,
      kind,
      occurredAt,
      title: first.title ?? '',
      memo: first.memo ?? '',
      amount,
      currency,
      category: kind === 'transfer' || isLendingKind(kind) ? '' : (first.category ?? ''),
      account: first.account || null,
      transferAccount: first.transfer_account || null,
      transferAmount: first.transfer_amount || null,
      splits: count > 1 ? lines : [],
      tags: splitTags(first.tags),
      person: first.person || null,
    });
  }
  return { rows, skipped };
}

export function parseImport(format: ImportFormat, text: string): ParseResult {
  switch (format) {
    case 'dime':
      return parseDime(text);
    case 'cashew':
      return parseCashew(text);
    case 'native':
      return parseNative(text);
  }
}

export const IMPORT_FORMAT_LABELS: Record<ImportFormat, string> = {
  native: `${APP_NAME} CSV`,
  dime: 'Dime CSV',
  cashew: 'Cashew CSV',
};
