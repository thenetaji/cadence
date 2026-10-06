import { useRouter } from 'expo-router';
import * as React from 'react';
import { ScrollView, View } from 'react-native';

import { AddFab } from '@/components/app/add-fab';
import { EmptyState } from '@/components/app/empty-state';
import { SectionHeader } from '@/components/app/section-header';
import { Card } from '@/components/ui/card';
import { useAccounts, useBudgets, usePeriodSummary, useRecentTransactions, useSetting, useTodayKey } from '@/data/hooks';
import { BalanceCard } from '@/features/home/balance-card';
import { MonthCard } from '@/features/home/month-card';
import { UpcomingSection } from '@/features/home/upcoming-section';
import { TransactionListRow } from '@/features/transactions/transaction-list-row';
import { useMoneyContext } from '@/features/transactions/use-money-context';
import { periodFor } from '@/lib/dates';

const RECENT_COUNT = 8;

export default function Home() {
  const router = useRouter();
  const money = useMoneyContext({ relativeDays: true });
  const today = useTodayKey();
  const [weekStart] = useSetting('week_start');
  const [monthStart] = useSetting('month_start');
  const accounts = useAccounts();
  const month = React.useMemo(() => periodFor('month', today, { weekStart, monthStart }), [today, weekStart, monthStart]);
  const summary = usePeriodSummary(month);
  const budgets = useBudgets();
  const overall = budgets.find((b) => b.budget.scope === 'all' && b.budget.period === 'monthly') ?? budgets.find((b) => b.budget.scope === 'all');
  const recent = useRecentTransactions(RECENT_COUNT);

  return (
    <View className="flex-1 bg-bg">
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerClassName="pb-28 pt-2"
        contentContainerStyle={recent.length === 0 ? { flexGrow: 1 } : undefined}>
        <View className="px-4">
          <BalanceCard
            accounts={accounts}
            displayCurrency={money.displayCurrency}
            locale={money.locale}
            showDecimals={money.showDecimals}
            rates={money.rates}
          />
        </View>
        <SectionHeader title="This month" />
        <MonthCard summary={summary} budget={overall} todayKey={today} locale={money.locale} showDecimals={money.showDecimals} />
        <UpcomingSection todayKey={today} locale={money.locale} showDecimals={money.showDecimals} />
        <SectionHeader title="Recent" actionLabel={recent.length > 0 ? 'All' : undefined} onAction={() => router.navigate('/activity')} />
        {recent.length > 0 ? (
          <Card className="mx-4 p-0">
            {recent.map((item, index) => (
              <TransactionListRow key={item.id} item={item} context={money} separator={index < recent.length - 1} />
            ))}
          </Card>
        ) : (
          <EmptyState message="No transactions yet" actionLabel="Add transaction" onAction={() => router.push('/transaction/new')} />
        )}
      </ScrollView>
      <AddFab />
    </View>
  );
}
