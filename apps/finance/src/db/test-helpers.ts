import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { schema, type Schema } from './schema';
import { seedDefaults } from './seed';
import { keyToLocalMs } from '@studio/dates';
import { createAccount } from './repos/accounts';
import { listCategories } from './repos/categories';

export type TestDb = BetterSQLite3Database<Schema>;

/** In-memory database with the generated migrations applied and default data seeded. */
export function createTestDb(options: { seed?: boolean } = {}): TestDb {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.join(__dirname, '..', '..', 'drizzle') });
  if (options.seed !== false) seedDefaults(db);
  return db;
}


export function categoryId(db: TestDb, name: string): string {
  const found = listCategories(db, undefined, { includeArchived: true }).find((c) => c.name === name);
  if (!found) throw new Error(`seed category missing: ${name}`);
  return found.id;
}

export function at(dateKey: string, hour = 12): number {
  return keyToLocalMs(dateKey, hour);
}

export function makeAccounts(db: TestDb) {
  const cash = createAccount(db, { name: 'Cash', type: 'cash', currency: 'INR', openingBalance: 100000, color: 'green' });
  const bank = createAccount(db, { name: 'HDFC', type: 'bank', currency: 'INR', openingBalance: 5000000, color: 'blue' });
  const usd = createAccount(db, { name: 'Wise USD', type: 'bank', currency: 'USD', openingBalance: 100000, color: 'indigo' });
  return { cash, bank, usd };
}
