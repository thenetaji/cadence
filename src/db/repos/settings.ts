import { eq } from 'drizzle-orm';
import { settings } from '../schema';
import type { Db } from '../types';

export interface SettingsMap {
  display_currency: string;
  theme: 'system' | 'light' | 'dark';
  haptics: boolean;
  show_decimals: boolean;
  week_start: 1 | 7;
  month_start: number;
  default_account_id: string | null;
  lock_enabled: boolean;
  lock_timeout_s: 0 | 60 | 300;
  last_kind: 'expense' | 'income' | 'transfer';
  last_account_id: string | null;
  onboarding_done: boolean;
  schema_seeded: boolean;
  recent_searches: string[];
}

export type SettingKey = keyof SettingsMap;

export const DEFAULT_SETTINGS: Readonly<SettingsMap> = {
  display_currency: 'USD',
  theme: 'system',
  haptics: true,
  show_decimals: true,
  week_start: 1,
  month_start: 1,
  default_account_id: null,
  lock_enabled: false,
  lock_timeout_s: 0,
  last_kind: 'expense',
  last_account_id: null,
  onboarding_done: false,
  schema_seeded: false,
  recent_searches: [],
};

export const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS) as SettingKey[];

function decode<K extends SettingKey>(key: K, raw: string | undefined): SettingsMap[K] {
  if (raw === undefined) return DEFAULT_SETTINGS[key];
  try {
    return JSON.parse(raw) as SettingsMap[K];
  } catch {
    return DEFAULT_SETTINGS[key];
  }
}

export function getSetting<K extends SettingKey>(db: Db, key: K): SettingsMap[K] {
  const row = db.select().from(settings).where(eq(settings.key, key)).get();
  return decode(key, row?.value);
}

export function setSetting<K extends SettingKey>(db: Db, key: K, value: SettingsMap[K]): void {
  const encoded = JSON.stringify(value);
  db.insert(settings)
    .values({ key, value: encoded })
    .onConflictDoUpdate({ target: settings.key, set: { value: encoded } })
    .run();
}

export function getAllSettings(db: Db): SettingsMap {
  const rows = db.select().from(settings).all();
  const raw = new Map(rows.map((r) => [r.key, r.value]));
  const result: Record<string, unknown> = {};
  for (const key of SETTING_KEYS) result[key] = decode(key, raw.get(key));
  return result as unknown as SettingsMap;
}

export function insertMissingDefaults(db: Db): void {
  for (const key of SETTING_KEYS) {
    db.insert(settings)
      .values({ key, value: JSON.stringify(DEFAULT_SETTINGS[key]) })
      .onConflictDoNothing()
      .run();
  }
}
