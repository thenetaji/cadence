import * as React from 'react';
import { ScrollView, View } from 'react-native';

import { ListGroup, ListRow } from '@/components/app/list-group';
import { showToast } from '@/components/app/toast-store';
import { useActions } from '@/data/actions';
import { useSetting, useSyncStatus } from '@/data/hooks';
import type { BackupSummary } from '@/db/repos/backup';
import { AppIcon } from '@/icons/app-icon';
import { getSyncProvider, type SyncProviderId } from '@/lib/sync';
import { Stagger } from '@/motion/stagger';
import { haptic } from '@/theme/haptics';
import { useTokens } from '@/theme/use-tokens';

import { backupTimeLabel, unavailableNote } from './format';
import { RestoreSheet } from './restore-sheet';

const PROVIDERS: readonly { id: SyncProviderId; label: string; icon: string }[] = [
  { id: 'icloud', label: 'iCloud', icon: 'cloud' },
  { id: 'gdrive', label: 'Google Drive', icon: 'cloud' },
];

/** Manual backup and restore, and the sync providers with their availability. */
export function BackupScreen() {
  const actions = useActions();
  const { colors } = useTokens();
  const { provider, lastBackupAt } = useSyncStatus();
  const [, setProvider] = useSetting('sync_provider');
  const [pending, setPending] = React.useState<{ json: string; summary: BackupSummary } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);
  const statuses = React.useMemo(() => PROVIDERS.map((p) => ({ ...p, status: getSyncProvider(p.id)?.status() ?? null })), []);

  const backUp = async () => {
    try {
      await actions.backup.share();
      haptic('success');
    } catch (error) {
      showToast({ message: error instanceof Error && error.message === 'sharing_unavailable' ? 'Sharing is not available' : 'Backup failed', haptic: 'warning' });
    }
  };

  const pick = async () => {
    try {
      const text = await actions.backup.pick();
      if (text === null) return;
      const result = actions.backup.validate(text);
      if (!result.ok) {
        showToast({ message: result.error === 'newer_schema' ? 'Made by a newer version' : 'Not a Farthing backup', haptic: 'warning' });
        return;
      }
      setPending({ json: text, summary: result.summary });
    } catch {
      showToast({ message: 'Could not read the file', haptic: 'warning' });
    }
  };

  const restore = () => {
    if (!pending) return;
    setBusy(true);
    try {
      actions.backup.restore(pending.json);
      haptic('success');
      setPending(null);
      showToast({ message: 'Restored', haptic: false });
    } catch {
      showToast({ message: 'Restore failed', haptic: 'warning' });
    } finally {
      setBusy(false);
    }
  };

  const toggleProvider = async (id: SyncProviderId, next: boolean) => {
    try {
      if (next) {
        await getSyncProvider(id)?.connect();
        setProvider(id);
        await actions.sync.now(getSyncProvider(id));
      } else {
        await getSyncProvider(id)?.disconnect();
        setProvider('none');
      }
    } catch {
      showToast({ message: 'Could not connect', haptic: 'warning' });
    }
  };

  const syncNow = async () => {
    setSyncing(true);
    try {
      await actions.sync.now();
      haptic('success');
    } catch {
      showToast({ message: 'Sync failed', haptic: 'warning' });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-bg" contentInsetAdjustmentBehavior="automatic" contentContainerClassName="gap-6 py-4 pb-12">
      <Stagger index={0}>
        <ListGroup header="Backup" footer={`Last backup: ${lastBackupAt ? backupTimeLabel(lastBackupAt) : 'never'}`}>
          <ListRow label="Back up now" icon={{ name: 'share', color: 'blue' }} chevron onPress={() => void backUp()} />
          <ListRow label="Restore from file" icon={{ name: 'download', color: 'teal' }} chevron onPress={() => void pick()} />
        </ListGroup>
      </Stagger>
      <Stagger index={1}>
        <ListGroup header="Sync">
          {statuses.map(({ id, label, icon, status }) =>
            status?.status === 'available' ? (
              <ListRow
                key={id}
                label={label}
                icon={{ name: icon, color: 'cyan' }}
                switchValue={provider === id}
                onSwitchChange={(next) => void toggleProvider(id, next)}
              />
            ) : (
              <ListRow
                key={id}
                label={label}
                icon={{ name: icon, color: 'gray' }}
                value={status?.status === 'unavailable' ? unavailableNote(status.reason) : undefined}
                trailing={
                  <View className="ml-2">
                    <AppIcon name="lock" size={14} color={colors.textTertiary} />
                  </View>
                }
              />
            ),
          )}
          {provider !== 'none' ? <ListRow label={syncing ? 'Syncing' : 'Sync now'} icon={{ name: 'swap', color: 'indigo' }} onPress={syncing ? undefined : () => void syncNow()} /> : null}
        </ListGroup>
      </Stagger>
      <RestoreSheet summary={pending?.summary ?? null} busy={busy} onConfirm={restore} onClose={() => setPending(null)} />
    </ScrollView>
  );
}
