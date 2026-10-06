import { randomUUID } from 'expo-crypto';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { useMemo, type ReactNode } from 'react';
import { DatabaseContext } from './context';
import { setIdGenerator } from './ids';

setIdGenerator(randomUUID);

type MigrationsConfig = Parameters<typeof useMigrations>[1];
type MigratableDb = Parameters<typeof useMigrations>[0];

export interface DatabaseProviderProps<Db extends MigratableDb> {
  /** The opened database. */
  db: Db;
  /** The app's drizzle migrations bundle (`drizzle/migrations`). */
  migrations: MigrationsConfig;
  /** Idempotent first-run seeding, run once the migrations succeeded. */
  seed?: (db: Db) => void;
  children: ReactNode;
  /** Rendered while migrating and seeding. */
  fallback?: ReactNode;
  /** Rendered when migration or seeding fails. */
  errorFallback?: (error: Error) => ReactNode;
}

type Seeded = { status: 'pending' } | { status: 'ready' } | { status: 'error'; error: Error };

export function DatabaseProvider<Db extends MigratableDb>({
  db,
  migrations,
  seed,
  children,
  fallback = null,
  errorFallback,
}: DatabaseProviderProps<Db>) {
  const { success, error: migrationError } = useMigrations(db, migrations);
  // The seed must be idempotent, so a repeated run (StrictMode) is harmless.
  const seeded = useMemo<Seeded>(() => {
    if (!success) return { status: 'pending' };
    try {
      seed?.(db);
      return { status: 'ready' };
    } catch (error) {
      return { status: 'error', error: error instanceof Error ? error : new Error(String(error)) };
    }
  }, [success, db, seed]);

  const value = useMemo<Db | null>(() => (seeded.status === 'ready' ? db : null), [seeded.status, db]);

  const failure = migrationError ?? (seeded.status === 'error' ? seeded.error : null);
  if (failure) return <>{errorFallback ? errorFallback(failure) : null}</>;
  if (!value) return <>{fallback}</>;
  return <DatabaseContext.Provider value={value}>{children}</DatabaseContext.Provider>;
}
