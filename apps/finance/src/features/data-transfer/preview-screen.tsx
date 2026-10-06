import { useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/app/empty-state';
import { ListGroup, ListRow } from '@/components/app/list-group';
import { showToast } from '@/components/app/toast-store';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useActions } from '@/data/actions';
import { useImportPlanner, useSettings, useTodayKey } from '@/data/hooks';
import { ValidationError } from '@/db/errors';
import { moneyLocale } from '@/features/transactions/use-money-context';
import { CASHEW_SAMPLE, DIME_SAMPLE, NATIVE_SAMPLE, dimeFixture } from '@/lib/csv/fixtures';
import { importBreakdown, parseImport, type ImportFormat, type ImportRow } from '@/lib/csv';
import { dayLabel, toDateKey } from '@studio/dates';
import { formatMoney } from '@studio/money';
import { haptic } from '@/theme/haptics';

import { useImportStore } from './store';

const PREVIEW_ROWS = 6;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

function fixtureRows(name: string | undefined): { rows: ImportRow[]; unreadable: number } | null {
  if (Platform.OS !== 'web' || !name) return null;
  const sources: Record<string, [ImportFormat, string]> = {
    dime: ['dime', dimeFixture(312)],
    'dime-small': ['dime', DIME_SAMPLE],
    cashew: ['cashew', CASHEW_SAMPLE],
    native: ['native', NATIVE_SAMPLE],
  };
  const source = sources[name];
  if (!source) return null;
  const { rows, skipped } = parseImport(source[0], source[1]);
  return { rows, unreadable: skipped };
}

/** Summary of what an import would do, a short list of the first rows and the Import button. */
export function ImportPreviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const actions = useActions();
  const settings = useSettings();
  const today = useTodayKey();
  const plan = useImportPlanner();
  const { fixture } = useLocalSearchParams<{ fixture?: string }>();
  const pending = useImportStore((s) => s.pending);
  const setPending = useImportStore((s) => s.set);
  const [busy, setBusy] = React.useState(false);

  const source = React.useMemo(() => fixtureRows(fixture) ?? (pending ? { rows: pending.rows, unreadable: pending.unreadable } : null), [fixture, pending]);
  const planned = React.useMemo(() => (source ? plan(source.rows) : null), [source, plan]);

  if (!source || !planned) {
    return (
      <View className="flex-1 justify-center bg-bg pb-24">
        <EmptyState message="Nothing to import" actionLabel="Choose file" onAction={() => router.back()} />
      </View>
    );
  }

  const { stats } = planned;
  const unreadable = source.unreadable + stats.skipped;
  const locale = moneyLocale(settings.display_currency);

  const run = () => {
    if (busy || stats.transactions === 0) return;
    setBusy(true);
    try {
      actions.import.run(source.rows, { displayCurrency: settings.display_currency, defaultAccountId: settings.default_account_id });
    } catch (error) {
      setBusy(false);
      haptic('error');
      if (error instanceof ValidationError) return;
      showToast({ message: 'Import failed', haptic: 'error' });
      return;
    }
    setPending(null);
    showToast({ message: 'Imported' });
    router.dismissTo('/settings');
  };

  return (
    <View className="flex-1 bg-bg">
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerClassName="gap-6 pb-8 pt-4">
        <View className="gap-1 px-5">
          <Text variant="headline" accessibilityRole="header">
            {plural(stats.transactions, 'transaction')}
          </Text>
          <Text variant="footnote" tone="secondary">
            {importBreakdown(stats)}
          </Text>
        </View>
        <ListGroup header="Preview">
          {planned.transactions.slice(0, PREVIEW_ROWS).map((t, index) => (
            <ListRow
              key={index}
              label={t.title || t.categoryName || 'Transfer'}
              subtitle={`${t.categoryName ?? 'Transfer'} · ${dayLabel(toDateKey(t.occurredAt), today)}`}
              value={`${t.kind === 'expense' ? '−' : t.kind === 'income' ? '+' : ''}${formatMoney(t.amount, t.currency, { locale })}`}
            />
          ))}
        </ListGroup>
        {stats.duplicates > 0 || unreadable > 0 ? (
          <ListGroup>
            {stats.duplicates > 0 ? <ListRow label="Duplicates skipped" value={String(stats.duplicates)} /> : null}
            {unreadable > 0 ? <ListRow label="Unreadable rows" value={String(unreadable)} /> : null}
          </ListGroup>
        ) : null}
      </ScrollView>
      <View className="px-4 pt-2" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
        <Button size="lg" loading={busy} disabled={stats.transactions === 0} onPress={run}>
          Import
        </Button>
      </View>
    </View>
  );
}
