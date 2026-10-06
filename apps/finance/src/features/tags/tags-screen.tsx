import { Stack, useRouter } from 'expo-router';
import * as React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/app/empty-state';
import { IconTile } from '@/components/app/icon-tile';
import { Card } from '@/components/ui/card';
import { Pressable } from '@/components/ui/pressable';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Text } from '@/components/ui/text';
import { useSettings, useTagTotals, useTodayKey } from '@/data/hooks';
import { useMoneyContext } from '@/features/transactions/use-money-context';
import { AppIcon } from '@/icons/app-icon';
import { ALL_DATES, periodFor, periodLabel } from '@studio/dates';
import { formatMoney } from '@studio/money';
import { Stagger } from '@/motion/stagger';
import { pressScale , useTokens } from '@studio/theme';

import { tagColorKey } from './model';

const SCOPES = ['Month', 'All time'] as const;

/** Every tag with its spend and count for the month or all time. */
export function TagsScreen() {
  const router = useRouter();
  const { colors } = useTokens();
  const money = useMoneyContext();
  const settings = useSettings();
  const today = useTodayKey();
  const [scope, setScope] = React.useState(0);
  const period = React.useMemo(
    () => (scope === 0 ? periodFor('month', today, { weekStart: settings.week_start, monthStart: settings.month_start }) : { type: 'custom' as const, ...ALL_DATES }),
    [scope, today, settings.week_start, settings.month_start],
  );
  const totals = useTagTotals(period);
  const decimals = money.showDecimals ? undefined : 0;

  if (totals.length === 0) {
    return (
      <View className="flex-1 justify-center bg-bg pb-24">
        <Stack.Screen options={{ title: 'Tags' }} />
        <EmptyState message="No tags" icon="tag" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-bg" contentInsetAdjustmentBehavior="automatic" contentContainerClassName="gap-4 pb-12 pt-2">
      <Stack.Screen options={{ title: 'Tags' }} />
      <Stagger index={0} className="gap-2 px-4">
        <SegmentedControl values={SCOPES} selectedIndex={scope} onChange={setScope} accessibilityLabel="Period" />
        <Text variant="footnote" tone="secondary" className="px-1">
          {scope === 0 ? periodLabel(period) : 'Since the start'}
        </Text>
      </Stagger>
      <Stagger index={1}>
        <Card className="mx-4 p-0">
          {totals.map((t, i) => (
            <Pressable
              key={t.tag.id}
              role="button"
              accessibilityLabel={`${t.tag.name}, ${formatMoney(t.spent, t.currency, { locale: money.locale, sign: 'none', decimals })}, ${t.count} transactions`}
              scale={pressScale.row}
              onPress={() => router.push({ pathname: '/tags/[id]', params: { id: t.tag.id } })}
              className="min-h-[60px] flex-row items-center gap-3 bg-surface px-4 py-2"
            >
              <IconTile icon="tag" color={tagColorKey(t.tag.color)} />
              <View className="min-w-0 flex-1">
                <Text variant="body" numberOfLines={1}>
                  {t.tag.name}
                </Text>
                <Text variant="subhead" tone="secondary" numberOfLines={1}>
                  {t.count === 0 ? 'No activity' : t.count === 1 ? '1 transaction' : `${t.count} transactions`}
                </Text>
              </View>
              <Text variant="body" numeric tone={t.spent > 0 ? 'default' : 'tertiary'} className="font-medium">
                {formatMoney(t.spent, t.currency, { locale: money.locale, sign: 'none', decimals })}
              </Text>
              <AppIcon name="chevron-right" size={13} color={colors.textTertiary} />
              {i < totals.length - 1 ? (
                <View pointerEvents="none" style={{ left: 66, height: StyleSheet.hairlineWidth, backgroundColor: colors.separator }} className="absolute bottom-0 right-0" />
              ) : null}
            </Pressable>
          ))}
        </Card>
      </Stagger>
    </ScrollView>
  );
}
