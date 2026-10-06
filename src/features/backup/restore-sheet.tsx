import { Modal, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ListGroup, ListRow } from '@/components/app/list-group';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import type { BackupSummary } from '@/db/repos/backup';

import { backupTimeLabel } from './format';

type RestoreSheetProps = { summary: BackupSummary | null; busy: boolean; onConfirm: () => void; onClose: () => void };

/** Counts from the picked backup, then Restore. Replaces everything on the device. */
export function RestoreSheet({ summary, busy, onConfirm, onClose }: RestoreSheetProps) {
  return (
    <Modal visible={summary !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaProvider>
        <View className="flex-1 bg-bg">
          <View className="h-14 flex-row items-center justify-between px-4">
            <View className="w-16 items-start">
              <Button variant="plainText" size="sm" onPress={onClose} disabled={busy}>
                Cancel
              </Button>
            </View>
            <Text variant="headline" accessibilityRole="header">
              Restore backup
            </Text>
            <View className="w-16" />
          </View>
          {summary ? (
            <View className="gap-6 pt-2">
              <ListGroup header={`Backed up ${backupTimeLabel(summary.exportedAt)}`} footer="This replaces everything on this device.">
                <ListRow label="Transactions" value={String(summary.transactions)} />
                <ListRow label="Accounts" value={String(summary.accounts)} />
                <ListRow label="Categories" value={String(summary.categories)} />
                <ListRow label="Budgets" value={String(summary.counts.budgets ?? 0)} />
                <ListRow label="Recurring" value={String(summary.counts.recurring_rules ?? 0)} />
              </ListGroup>
              <View className="px-4">
                <Button size="lg" loading={busy} onPress={onConfirm}>
                  Restore
                </Button>
              </View>
            </View>
          ) : null}
        </View>
      </SafeAreaProvider>
    </Modal>
  );
}
