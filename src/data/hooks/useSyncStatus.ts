import { useMemo } from 'react';
import { getSyncProvider, type SyncStatus } from '@/lib/sync';
import { useSettings } from './useSettings';

export interface SyncState {
  provider: 'none' | 'icloud' | 'gdrive';
  /** Null when no provider is selected. */
  status: SyncStatus | null;
  lastBackupAt: number | null;
}

/** The selected provider's availability (with the reason when unavailable) and the last backup/sync time. */
export function useSyncStatus(): SyncState {
  const { sync_provider: provider, last_backup_at: lastBackupAt } = useSettings();
  return useMemo(() => ({ provider, status: getSyncProvider(provider)?.status() ?? null, lastBackupAt }), [provider, lastBackupAt]);
}
