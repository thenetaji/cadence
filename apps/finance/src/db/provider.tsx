import { randomUUID } from 'expo-crypto';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { useMemo, type ReactNode } from 'react';
import migrations from '../../drizzle/migrations';
import { db } from './client';
import { DatabaseContext, useDb } from './context';
import { setIdGenerator } from './ids';
import { seedDefaults } from './seed';
import type { Db } from './types';

setIdGenerator(randomUUID);

export interface DatabaseProviderProps {
  children: ReactNode;
  /** Rendered while migrating and seeding. */
  fallback?: ReactNode;
  /** Rendered when migration or seeding fails. */
  errorFallback?: (error: Error) => ReactNode;
}

type Seeded = { status: 'pending' } | { status: 'ready' } | { status: 'error'; error: Error };

export function DatabaseProvider({ children, fallback = null, errorFallback }: DatabaseProviderProps) {
  const { success, error: migrationError } = useMigrations(db, migrations);
  // seedDefaults is idempotent, so a repeated run (StrictMode) is harmless.
  const seeded = useMemo<Seeded>(() => {
    if (!success) return { status: 'pending' };
    try {
      seedDefaults(db);
      return { status: 'ready' };
    } catch (error) {
      return { status: 'error', error: error instanceof Error ? error : new Error(String(error)) };
    }
  }, [success]);

  const value = useMemo<Db | null>(() => (seeded.status === 'ready' ? db : null), [seeded.status]);

  const failure = migrationError ?? (seeded.status === 'error' ? seeded.error : null);
  if (failure) return <>{errorFallback ? errorFallback(failure) : null}</>;
  if (!value) return <>{fallback}</>;
  return <DatabaseContext.Provider value={value}>{children}</DatabaseContext.Provider>;
}

export { useDb };
