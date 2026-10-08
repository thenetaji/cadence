import { getTableColumns, sql, type AnyColumn } from 'drizzle-orm';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';
import journal from '../../../drizzle/meta/_journal.json';
import {
  accounts,
  attachments,
  budgetCategories,
  budgets,
  categories,
  fxRates,
  people,
  recurringRules,
  settings,
  tags,
  titleMemory,
  transactionSplits,
  transactionTags,
  transactions,
} from '../schema';
import type { Db } from '../types';
import { DEFAULT_SETTINGS, getSetting, setSetting, type SettingKey } from './settings';

export const BACKUP_FORMAT = 'farthing-backup';
export const BACKUP_VERSION = 1;
/** Number of migrations this build knows; a backup from a build with more cannot be restored. */
export const SCHEMA_VERSION = journal.entries.length;

interface TableSpec {
  /** Key in the backup document. */
  key: string;
  table: SQLiteTable;
  /** Columns that give a stable, total order. */
  order: readonly string[];
  /** Missing from older backups is fine (treated as empty). */
  optional?: boolean;
}

/** Parents before children: restore inserts in this order and clears in reverse. */
const TABLES: readonly TableSpec[] = [
  { key: 'accounts', table: accounts, order: ['id'] },
  { key: 'categories', table: categories, order: ['id'] },
  { key: 'people', table: people, order: ['id'], optional: true },
  { key: 'tags', table: tags, order: ['id'], optional: true },
  { key: 'recurring_rules', table: recurringRules, order: ['id'], optional: true },
  { key: 'transactions', table: transactions, order: ['id'] },
  { key: 'transaction_splits', table: transactionSplits, order: ['id'], optional: true },
  { key: 'transaction_tags', table: transactionTags, order: ['transactionId', 'tagId'], optional: true },
  { key: 'attachments', table: attachments, order: ['id'], optional: true },
  { key: 'budgets', table: budgets, order: ['id'], optional: true },
  { key: 'budget_categories', table: budgetCategories, order: ['budgetId', 'categoryId'], optional: true },
  { key: 'title_memory', table: titleMemory, order: ['titleNorm'], optional: true },
  { key: 'fx_rates', table: fxRates, order: ['base', 'quote'], optional: true },
  { key: 'settings', table: settings, order: ['key'] },
];

export type BackupRow = Record<string, string | number | boolean | null>;

export interface Backup {
  format: typeof BACKUP_FORMAT;
  version: number;
  schemaVersion: number;
  appVersion: string;
  /** Epoch ms when the document was produced. Last-write-wins sync compares this. */
  exportedAt: number;
  tables: Record<string, BackupRow[]>;
}

/** Settings that belong to this device and survive a restore. */
export const DEVICE_SETTING_KEYS: readonly SettingKey[] = [
  'theme',
  'icon_style',
  'icon_background',
  'home_layout',
  'hide_amounts',
  'haptics',
  'lock_enabled',
  'lock_timeout_s',
  'sync_provider',
  'last_backup_at',
  'reminder_daily_enabled',
  'reminder_daily_time',
  'reminder_bills',
  'reminder_budgets',
  'reminder_budget_fired',
];

export type BackupErrorCode = 'not_json' | 'not_a_backup' | 'unsupported_version' | 'newer_schema' | 'missing_table' | 'bad_table' | 'bad_row';

export class BackupError extends Error {
  readonly code: BackupErrorCode;
  constructor(code: BackupErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'BackupError';
    this.code = code;
  }
}

export interface ExportOptions {
  appVersion?: string;
  now?: number;
}

const columnsOf = (table: SQLiteTable) => Object.entries(getTableColumns(table)) as [string, AnyColumn][];

function sortRows(rows: Record<string, unknown>[], order: readonly string[]): Record<string, unknown>[] {
  return rows.sort((a, b) => {
    for (const key of order) {
      const x = String(a[key]);
      const y = String(b[key]);
      if (x !== y) return x < y ? -1 : 1;
    }
    return 0;
  });
}

/** A versioned document holding every table. Pass the result of `JSON.stringify` to a file or provider. */
export function exportBackup(db: Db, options: ExportOptions = {}): Backup {
  const out: Record<string, BackupRow[]> = {};
  for (const spec of TABLES) {
    const rows = db.select().from(spec.table).all() as Record<string, unknown>[];
    out[spec.key] = sortRows(rows, spec.order) as BackupRow[];
  }
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    schemaVersion: SCHEMA_VERSION,
    appVersion: options.appVersion ?? '0.0.0',
    exportedAt: options.now ?? Date.now(),
    tables: out,
  };
}

export function serializeBackup(backup: Backup): string {
  return JSON.stringify(backup);
}

export interface BackupSummary {
  exportedAt: number;
  appVersion: string;
  schemaVersion: number;
  transactions: number;
  accounts: number;
  categories: number;
  /** Rows per table. */
  counts: Record<string, number>;
}

export type BackupValidation = { ok: true; backup: Backup; summary: BackupSummary } | { ok: false; error: BackupErrorCode; message: string };

function typeMatches(column: AnyColumn, value: unknown): boolean {
  if (value === null) return !column.notNull;
  switch (column.dataType) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'boolean':
      return typeof value === 'boolean' || value === 0 || value === 1;
    default:
      return true;
  }
}

function check(input: unknown): Backup {
  let doc: unknown = input;
  if (typeof input === 'string') {
    try {
      doc = JSON.parse(input);
    } catch {
      throw new BackupError('not_json', 'the file is not valid JSON');
    }
  }
  if (typeof doc !== 'object' || doc === null) throw new BackupError('not_a_backup');
  const d = doc as Record<string, unknown>;
  if (d.format !== BACKUP_FORMAT || typeof d.tables !== 'object' || d.tables === null) throw new BackupError('not_a_backup');
  if (typeof d.version !== 'number' || d.version < 1 || d.version > BACKUP_VERSION) throw new BackupError('unsupported_version');
  if (typeof d.schemaVersion !== 'number' || !Number.isInteger(d.schemaVersion) || d.schemaVersion < 1) throw new BackupError('not_a_backup', 'missing schema version');
  if (d.schemaVersion > SCHEMA_VERSION) throw new BackupError('newer_schema', 'the backup was made by a newer version of the app');
  if (typeof d.exportedAt !== 'number') throw new BackupError('not_a_backup', 'missing export time');
  const tables = d.tables as Record<string, unknown>;
  const normalised: Record<string, BackupRow[]> = {};
  for (const spec of TABLES) {
    const rows = tables[spec.key];
    if (rows === undefined && spec.optional) {
      normalised[spec.key] = [];
      continue;
    }
    if (rows === undefined) throw new BackupError('missing_table', `missing table ${spec.key}`);
    if (!Array.isArray(rows)) throw new BackupError('bad_table', `${spec.key} is not a list`);
    const columns = columnsOf(spec.table);
    rows.forEach((row, index) => {
      if (typeof row !== 'object' || row === null || Array.isArray(row)) throw new BackupError('bad_row', `${spec.key}[${index}] is not an object`);
      const record = row as Record<string, unknown>;
      for (const [name, column] of columns) {
        const value = record[name];
        if (value === undefined) {
          // Columns added by later migrations may be absent in older backups; only required, defaultless ones are an error.
          if (column.notNull && !column.hasDefault) throw new BackupError('bad_row', `${spec.key}[${index}] is missing ${name}`);
          continue;
        }
        if (!typeMatches(column, value)) throw new BackupError('bad_row', `${spec.key}[${index}].${name} has the wrong type`);
      }
    });
    normalised[spec.key] = rows as BackupRow[];
  }
  return { ...(d as unknown as Backup), tables: normalised };
}

/** Checks structure, versions and column types without touching the database. */
export function validateBackup(json: unknown): BackupValidation {
  try {
    const backup = check(json);
    const counts = Object.fromEntries(Object.entries(backup.tables).map(([key, rows]) => [key, rows.length]));
    return {
      ok: true,
      backup,
      summary: {
        exportedAt: backup.exportedAt,
        appVersion: backup.appVersion,
        schemaVersion: backup.schemaVersion,
        transactions: counts.transactions ?? 0,
        accounts: counts.accounts ?? 0,
        categories: counts.categories ?? 0,
        counts,
      },
    };
  } catch (error) {
    if (error instanceof BackupError) return { ok: false, error: error.code, message: error.message };
    throw error;
  }
}

/** Keeps each statement under SQLite's bound-variable limit. */
function chunked<T>(rows: readonly T[], columnCount: number): T[][] {
  const size = Math.max(1, Math.floor(900 / columnCount));
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

/**
 * Replaces every row with the backup's, atomically: any failure leaves the database untouched.
 * Device settings (theme, icons, hide amounts, reminders, sync, lock) keep their local values.
 * Throws {@link BackupError} when the document is invalid.
 */
export function restoreBackup(db: Db, json: unknown): BackupSummary {
  const validation = validateBackup(json);
  if (!validation.ok) throw new BackupError(validation.error, validation.message);
  const { backup, summary } = validation;
  db.transaction((tx) => {
    const kept = DEVICE_SETTING_KEYS.map((key) => [key, getSetting(tx, key)] as const);
    for (const spec of [...TABLES].reverse()) tx.delete(spec.table).run();
    for (const spec of TABLES) {
      const columns = columnsOf(spec.table);
      const rows = (backup.tables[spec.key] ?? []).map((row) => {
        const record: Record<string, unknown> = {};
        for (const [name, column] of columns) {
          const value = row[name];
          if (value === undefined) continue;
          record[name] = column.dataType === 'boolean' ? Boolean(value) : value;
        }
        return record;
      });
      for (const part of chunked(rows, columns.length)) tx.insert(spec.table).values(part as never).run();
    }
    for (const [key, value] of kept) setSetting(tx, key, value as never);
    // Settings missing from older backups fall back to their defaults.
    for (const key of Object.keys(DEFAULT_SETTINGS) as SettingKey[]) {
      if (!backup.tables.settings?.some((r) => r.key === key) && !DEVICE_SETTING_KEYS.includes(key)) setSetting(tx, key, DEFAULT_SETTINGS[key] as never);
    }
  });
  return summary;
}

/**
 * Latest modification time across user data (ms). Deletions are not tracked. A device with no accounts
 * and no transactions counts as empty (0) even though its default categories were just seeded, so a
 * fresh install never looks newer than a real backup.
 */
export function localModifiedAt(db: Db): number {
  const started = db.select({ id: accounts.id }).from(accounts).limit(1).get() ?? db.select({ id: transactions.id }).from(transactions).limit(1).get();
  if (!started) return 0;
  const latest = (table: SQLiteTable, column: string): number => {
    const col = (getTableColumns(table) as Record<string, AnyColumn>)[column] as AnyColumn;
    return db.select({ v: sql<number | null>`max(${col})` }).from(table).get()?.v ?? 0;
  };
  return Math.max(
    latest(accounts, 'updatedAt'),
    latest(categories, 'updatedAt'),
    latest(transactions, 'updatedAt'),
    latest(recurringRules, 'updatedAt'),
    latest(budgets, 'updatedAt'),
    latest(people, 'createdAt'),
    latest(tags, 'createdAt'),
    latest(attachments, 'createdAt'),
    latest(fxRates, 'updatedAt'),
  );
}
