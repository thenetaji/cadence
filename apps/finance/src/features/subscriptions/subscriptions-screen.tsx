import { Stack, useRouter } from 'expo-router';
import * as React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Amount , EmptyState , HeaderButton, barRight , IconTile , SectionHeader , Card , Pressable , Text } from '@studio/ui';
import { useCategories, useSubscriptions, useTodayKey } from '@/data/hooks';
import { useMoneyContext } from '@/features/transactions/use-money-context';
import { formatMoney, formatMoneyForSpeech } from '@studio/money';
import { Stagger } from '@studio/motion';
import { useTokens } from '@studio/theme';
import type { CategoryColorKey } from '@studio/theme';

import { cadenceLabel, nextChargeLabel } from './labels';

/** Active expense rules as subscriptions: monthly total hero, then rows by next charge. */
export function SubscriptionsScreen() {
  const router = useRouter();
  const { colors } = useTokens();
  const money = useMoneyContext();
  const todayKey = useTodayKey();
  const list = useSubscriptions();
  const categories = useCategories();
  const categoryMap = React.useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const items = React.useMemo(
    () => [...list.items].sort((a, b) => a.nextCharge.localeCompare(b.nextCharge) || b.monthlyDisplay - a.monthlyDisplay),
    [list.items],
  );

  const add = () => router.push({ pathname: '/transaction/new', params: { kind: 'expense' } });
  const header = <Stack.Screen options={{ title: 'Subscriptions', ...barRight(<HeaderButton symbol="plus" label="Add subscription" onPress={add} />) }} />;

  if (items.length === 0) {
    return (
      <View className="flex-1 bg-bg">
        {header}
        <EmptyState message="No subscriptions" icon="repeat" actionLabel="Add subscription" onAction={add} />
      </View>
    );
  }

  const opts = { locale: money.locale, decimals: money.showDecimals ? undefined : 0, sign: 'none' } as const;
  const monthly = formatMoney(list.totals.monthly, list.currency, opts);
  const yearly = formatMoney(list.totals.yearly, list.currency, { ...opts, decimals: 0 });

  return (
    <ScrollView className="flex-1 bg-bg" contentInsetAdjustmentBehavior="automatic" contentContainerClassName="pb-12">
      {header}
      <Stagger index={0} className="px-6 pb-2 pt-4">
        <Text variant="footnote" tone="secondary">
          Per month
        </Text>
        <Amount
          value={monthly}
          variant="hero"
          animate="intro"
          accessibilityLabel={`${formatMoneyForSpeech(list.totals.monthly, list.currency, { sign: 'none', locale: money.locale })} a month`}
        />
        <Text variant="subhead" tone="secondary" numeric className="pt-1">
          {`${yearly} a year · ${list.totals.count} ${list.totals.count === 1 ? 'subscription' : 'subscriptions'}`}
        </Text>
      </Stagger>
      <Stagger index={1}>
        <SectionHeader title="Next charges" />
        <Card className="mx-4 p-0">
          {items.map(({ rule, monthlyDisplay, nextCharge }, index) => {
            const category = rule.categoryId ? categoryMap.get(rule.categoryId) : undefined;
            const title = rule.title || category?.name || 'Subscription';
            const cadence = cadenceLabel(rule.frequency, rule.interval);
            const next = nextChargeLabel(nextCharge, todayKey);
            const amount = formatMoney(monthlyDisplay, list.currency, { locale: money.locale, decimals: money.showDecimals ? undefined : 0, sign: 'none' });
            const soon = next === 'Today' || next === 'Tomorrow';
            return (
              <Pressable
                key={rule.id}
                role="button"
                scale={1}
                accessibilityLabel={`${title}, ${cadence}, ${next}, ${formatMoneyForSpeech(monthlyDisplay, list.currency, { sign: 'none', locale: money.locale })} a month`}
                onPress={() => router.push({ pathname: '/recurring/[id]', params: { id: rule.id } })}
                className="min-h-[64px] flex-row items-center px-4 py-2 active:bg-fill"
              >
                <View className="mr-3">
                  <IconTile icon={category?.icon ?? 'arrow.triangle.2.circlepath'} color={(category?.color ?? 'gray') as CategoryColorKey} />
                </View>
                <View className="flex-1 pr-3">
                  <Text variant="body" numberOfLines={1}>
                    {title}
                  </Text>
                  <Text variant="subhead" tone="secondary" numberOfLines={1}>
                    {`${cadence} · `}
                    <Text variant="subhead" tone={soon ? 'accent' : 'secondary'}>
                      {next}
                    </Text>
                  </Text>
                </View>
                <View className="items-end">
                  <Amount value={amount} variant="row" />
                  <Text variant="caption" tone="tertiary">
                    a month
                  </Text>
                </View>
                {index < items.length - 1 ? (
                  <View
                    pointerEvents="none"
                    style={{ left: 66, height: StyleSheet.hairlineWidth, backgroundColor: colors.separator }}
                    className="absolute bottom-0 right-0"
                  />
                ) : null}
              </Pressable>
            );
          })}
        </Card>
      </Stagger>
    </ScrollView>
  );
}
