import { useRouter } from 'expo-router';
import * as React from 'react';
import { ScrollView, View } from 'react-native';

import { AddFab } from '@/components/app/add-fab';
import { EmptyState } from '@/components/app/empty-state';
import { SectionHeader } from '@/components/app/section-header';
import { Card } from '@/components/ui/card';
import { useAccounts, useBudgets, useHomeSpend, useInsights, useRecentTransactions, useSetting, useTodayKey } from '@/data/hooks';
import { BudgetsSection } from '@/features/home/budgets-section';
import { QuickAdd } from '@/features/home/quick-add';
import { SpendHero } from '@/features/home/spend-hero';
import { StatRow } from '@/features/home/stat-row';
import { HomeTopBar } from '@/features/home/top-bar';
import { TopCategories } from '@/features/home/top-categories';
import { UpcomingSection } from '@/features/home/upcoming-section';
import { TransactionListRow } from '@/features/transactions/transaction-list-row';
import { useMoneyContext } from '@/features/transactions/use-money-context';
import { diffDays, monthName, monthShort, parseKey, periodFor, previousPeriod } from '@/lib/dates';
import { formatMoney, sumConverted } from '@/lib/money';

const RECENT_COUNT = 5;

export default function Home() {
  const router = useRouter();
  const money = useMoneyContext({ relativeDays: true });
  const today = useTodayKey();
  const [weekStart] = useSetting('week_start');
  const [monthStart] = useSetting('month_start');
  const accounts = useAccounts();
  const month = React.useMemo(() => periodFor('month', today, { weekStart, monthStart }), [today, weekStart, monthStart]);
  const spend = useHomeSpend(month, today);
  const insights = useInsights(month, 'expense');
  const budgets = useBudgets();
  const overall = budgets.find((b) => b.budget.scope === 'all' && b.budget.period === 'monthly') ?? budgets.find((b) => b.budget.scope === 'all');
  const recent = useRecentTransactions(RECENT_COUNT);

  const decimals = money.showDecimals ? undefined : 0;
  const balance = React.useMemo(
    () => sumConverted(accounts.map((a) => ({ minor: a.balance, currency: a.currency })), money.displayCurrency, money.rates).total,
    [accounts, money.displayCurrency, money.rates],
  );
  const fmt = (minor: number, sign: 'none' | 'auto' = 'none') =>
    formatMoney(minor, money.displayCurrency, { locale: money.locale, sign, decimals });
  const previousMonth = monthShort(parseKey(previousPeriod(month).to).month);

  const now = parseKey(today);
  const left = Math.max(diffDays(today, month.to), 0);
  const caption = `${now.day} ${monthShort(now.month)} · ${left} ${left === 1 ? 'day' : 'days'} left`;

  return (
    <View className="flex-1 bg-bg">
      <HomeTopBar month={monthName(parseKey(month.to).month)} caption={caption} />
      <ScrollView contentContainerClassName="gap-3 pb-28 pt-2" contentContainerStyle={recent.length === 0 ? { flexGrow: 1 } : undefined}>
        <SpendHero spend={spend} previousMonth={previousMonth} budget={overall} todayKey={today} locale={money.locale} showDecimals={money.showDecimals} />
        <StatRow earned={fmt(spend.earned)} balance={fmt(balance, 'auto')} balanceNegative={balance < 0} perDay={fmt(spend.perDay)} />
        <View>
          <QuickAdd displayCurrency={money.displayCurrency} locale={money.locale} showDecimals={money.showDecimals} />
          <TopCategories insights={insights} locale={money.locale} showDecimals={money.showDecimals} />
          <BudgetsSection todayKey={today} locale={money.locale} showDecimals={money.showDecimals} />
          <UpcomingSection todayKey={today} locale={money.locale} showDecimals={money.showDecimals} />
          <SectionHeader title="Recent" actionLabel={recent.length > 0 ? 'All' : undefined} onAction={() => router.navigate('/activity')} />
          {recent.length > 0 ? (
            <Card className="mx-4 rounded-2xl p-0">
              {recent.map((item, index) => (
                <TransactionListRow key={item.id} item={item} context={money} separator={index < recent.length - 1} />
              ))}
            </Card>
          ) : (
            <EmptyState message="No transactions yet" actionLabel="Add transaction" onAction={() => router.push('/transaction/new')} />
          )}
        </View>
      </ScrollView>
      <AddFab />
    </View>
  );
}
