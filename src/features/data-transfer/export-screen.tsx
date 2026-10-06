import * as React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ListGroup, ListRow } from '@/components/app/list-group';
import { AppIcon } from '@/icons/app-icon';
import { showToast } from '@/components/app/toast-store';
import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { useAccounts, useExportReader, useSettings } from '@/data/hooks';
import { FormRow } from '@/features/entry/form-row';
import { DatePicker } from '@/features/transaction-form/date-picker';
import { buildExportCsv } from '@/lib/csv';
import { addDays, keyToLocalMs, toDateKey, type DateKey } from '@/lib/dates';
import type { CategoryColorKey } from '@/theme/tokens';
import { haptic } from '@/theme/haptics';
import { useTokens } from '@/theme/use-tokens';

import { exportBounds, type ExportRange } from './range';
import { shareTextFile } from './share-file';

const RANGES: readonly ExportRange[] = ['month', 'year', 'all', 'custom'];
const RANGE_LABELS: Record<ExportRange, string> = { month: 'This month', year: 'This year', all: 'All', custom: 'Custom' };

/** A label-less grouped-list row holding one control; the group's footnote header names it. */
function ControlRow({ children, showSeparator = false }: { children: React.ReactNode; showSeparator?: boolean }) {
  const { colors } = useTokens();
  return (
    <View className="bg-surface px-4 py-3">
      {children}
      {showSeparator ? (
        <View pointerEvents="none" style={{ left: 16, height: StyleSheet.hairlineWidth, backgroundColor: colors.separator }} className="absolute bottom-0 right-0" />
      ) : null}
    </View>
  );
}

/** Range, accounts and the Export CSV button. */
export function ExportScreen() {
  const { colors } = useTokens();
  const settings = useSettings();
  const accounts = useAccounts({ includeArchived: true });
  const read = useExportReader();
  const [range, setRange] = React.useState<ExportRange>('month');
  const [from, setFrom] = React.useState<DateKey>(() => addDays(toDateKey(Date.now()), -29));
  const [to, setTo] = React.useState<DateKey>(() => toDateKey(Date.now()));
  const [excluded, setExcluded] = React.useState<ReadonlySet<string>>(new Set());
  const [busy, setBusy] = React.useState(false);

  const selected = accounts.filter((a) => !excluded.has(a.id));
  const toggle = (id: string) => {
    haptic('selection');
    setExcluded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const run = async () => {
    const today = toDateKey(Date.now());
    const bounds = exportBounds(range, today, { from, to }, { weekStart: settings.week_start, monthStart: settings.month_start });
    const records = read({ ...bounds, accountIds: selected.map((a) => a.id) });
    if (records.length === 0) {
      showToast({ message: 'No transactions', haptic: 'warning' });
      return;
    }
    setBusy(true);
    try {
      await shareTextFile(`farthing-${today}.csv`, buildExportCsv(records));
      haptic('success');
    } catch {
      showToast({ message: 'Export failed', haptic: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-bg" contentInsetAdjustmentBehavior="automatic" contentContainerClassName="gap-6 pb-12 pt-4">
      <ListGroup header="Range">
        <ControlRow showSeparator={range === 'custom'}>
          <SegmentedControl
            values={RANGES.map((r) => RANGE_LABELS[r])}
            selectedIndex={RANGES.indexOf(range)}
            onChange={(index) => setRange(RANGES[index] ?? 'all')}
            accessibilityLabel="Range"
          />
        </ControlRow>
        {range === 'custom' ? (
          <FormRow label="From">
            <DatePicker mode="date" display="compact" value={keyToLocalMs(from, 12)} onChange={(ms) => setFrom(toDateKey(ms))} />
          </FormRow>
        ) : null}
        {range === 'custom' ? (
          <FormRow label="To">
            <DatePicker mode="date" display="compact" value={keyToLocalMs(to, 12)} onChange={(ms) => setTo(toDateKey(ms))} />
          </FormRow>
        ) : null}
      </ListGroup>
      <ListGroup header="Accounts">
        {accounts.map((account) => (
          <ListRow
            key={account.id}
            label={account.name}
            subtitle={account.currency}
            icon={{ name: account.icon, color: account.color as CategoryColorKey }}
            trailing={
              excluded.has(account.id) ? undefined : <AppIcon name="checkmark" size={16} color={colors.accent} />
            }
            onPress={() => toggle(account.id)}
          />
        ))}
      </ListGroup>
      <View className="px-4">
        <Button size="lg" loading={busy} disabled={selected.length === 0} onPress={run}>
          Export CSV
        </Button>
      </View>
    </ScrollView>
  );
}
