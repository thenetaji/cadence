import { Stack, useRouter } from 'expo-router';
import * as React from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeOut, LinearTransition } from 'react-native-reanimated';

import { EmptyState } from '@/components/app/empty-state';
import { HeaderButton, barRight } from '@/components/app/header-button';
import { SectionHeader } from '@/components/app/section-header';
import { showToast } from '@/components/app/toast-store';
import { TransactionRow } from '@/components/app/transaction-row';
import { Card } from '@/components/ui/card';
import { useActions } from '@/data/actions';
import { useAccounts, useCategories, useRecurringRules, useTodayKey, useUpcoming } from '@/data/hooks';
import { toUpcomingRow } from '@/features/home/upcoming-model';
import { useMoneyContext } from '@/features/transactions/use-money-context';
import { durations } from '@studio/theme';

import { cadenceSummary } from './cadence';

const UPCOMING_DAYS = 30;

/** Recurring list: occurrences due in the next 30 days, then every rule. */
export function RecurringScreen() {
  const router = useRouter();
  const actions = useActions();
  const money = useMoneyContext();
  const todayKey = useTodayKey();
  const occurrences = useUpcoming(UPCOMING_DAYS);
  const stored = useRecurringRules();
  const rules = React.useMemo(() => [...stored].sort((a, b) => Number(a.pausedAt !== null) - Number(b.pausedAt !== null)), [stored]);
  const categories = useCategories();
  const accounts = useAccounts({ includeArchived: true });
  const categoryMap = React.useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const accountMap = React.useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const ctx = React.useMemo(
    () => ({ todayKey, locale: money.locale, showDecimals: money.showDecimals, categories: categoryMap, accounts: accountMap }),
    [todayKey, money.locale, money.showDecimals, categoryMap, accountMap],
  );

  const upcoming = React.useMemo(() => {
    const seen = new Set<string>();
    return occurrences.map((occurrence) => {
      // Post now and Skip act on a rule's next occurrence, so only that row can swipe.
      const first = !seen.has(occurrence.rule.id);
      seen.add(occurrence.rule.id);
      return { key: `${occurrence.rule.id}:${occurrence.dueDate}`, first, row: toUpcomingRow(occurrence, ctx) };
    });
  }, [occurrences, ctx]);

  const add = () => router.push({ pathname: '/transaction/new', params: { kind: 'expense' } });
  const open = (id: string) => router.push({ pathname: '/recurring/[id]', params: { id } });

  const header = (
    <Stack.Screen options={{
        title: 'Recurring',
        ...barRight(
          <View className="flex-row items-center">
            <HeaderButton symbol="chart.pie.fill" label="Subscriptions" onPress={() => router.push('/subscriptions')} />
            <HeaderButton symbol="plus" label="Add recurring transaction" onPress={add} />
          </View>
        ),
      }}
    />
  );

  if (rules.length === 0) {
    return (
      <View className="flex-1 bg-bg">
        {header}
        <EmptyState message="No recurring transactions" actionLabel="Add rule" onAction={add} />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-bg" contentInsetAdjustmentBehavior="automatic" contentContainerClassName="pb-12">
      {header}
      {upcoming.length > 0 ? (
        <View>
          <SectionHeader title="Upcoming" />
          <Card className="mx-4 p-0">
            {upcoming.map(({ key, first, row }, index) => (
              <Animated.View key={key} exiting={FadeOut.duration(durations.press)} layout={LinearTransition.duration(durations.row)}>
                <TransactionRow
                  kind={row.kind}
                  title={row.title}
                  subtitle={row.subtitle}
                  amount={row.amount}
                  trailing={row.trailing}
                  icon={row.icon}
                  color={row.color}
                  accessibilityLabel={row.accessibilityLabel}
                  separator={index < upcoming.length - 1}
                  onPress={() => open(row.ruleId)}
                  leftAction={
                    first
                      ? {
                          label: 'Post now',
                          symbol: 'checkmark.circle.fill',
                          tone: 'accent',
                          onTrigger: () => {
                            actions.recurring.postNow(row.ruleId);
                            showToast({ message: 'Posted' });
                          },
                        }
                      : undefined
                  }
                  rightAction={
                    first
                      ? {
                          label: 'Skip',
                          symbol: 'forward.fill',
                          tone: 'neutral',
                          onTrigger: () => {
                            actions.recurring.skip(row.ruleId);
                            showToast({ message: 'Skipped', haptic: 'light' });
                          },
                        }
                      : undefined
                  }
                />
              </Animated.View>
            ))}
          </Card>
        </View>
      ) : null}
      <View>
        <SectionHeader title="Rules" />
        <Card className="mx-4 p-0">
          {rules.map((rule, index) => {
            const row = toUpcomingRow({ rule, dueDate: rule.nextDue }, ctx);
            const paused = rule.pausedAt !== null;
            return (
              <View key={rule.id} style={{ opacity: paused ? 0.5 : 1 }}>
                <TransactionRow
                  kind={row.kind}
                  title={row.title}
                  subtitle={cadenceSummary(rule)}
                  amount={row.amount}
                  trailing={paused ? 'Paused' : undefined}
                  icon={row.icon}
                  color={row.color}
                  accessibilityLabel={[row.title, cadenceSummary(rule), paused ? 'Paused' : ''].filter(Boolean).join(', ')}
                  separator={index < rules.length - 1}
                  onPress={() => open(rule.id)}
                />
              </View>
            );
          })}
        </Card>
      </View>
    </ScrollView>
  );
}
