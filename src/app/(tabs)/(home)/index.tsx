import { useRouter } from 'expo-router';
import * as React from 'react';
import { ScrollView } from 'react-native';

import { AddFab } from '@/components/app/add-fab';
import { EmptyState } from '@/components/app/empty-state';
import { Card } from '@/components/ui/card';
import { useAccounts, useHomeSpend, useInsights, useRecentTransactions, useSetting, useTodayKey } from '@/data/hooks';
import { ComingUp } from '@/features/home/coming-up';
import { daysLeftLabel, headerDay } from '@/features/home/curve';
import { QuickAdd } from '@/features/home/quick-add';
import { HomeSectionHeader } from '@/features/home/section-header';
import { SpendHero } from '@/features/home/spend-hero';
import { StatRow } from '@/features/home/stat-row';
import { HomeTopBar } from '@/features/home/top-bar';
import { TopCategories } from '@/features/home/top-categories';
import { TransactionListRow } from '@/features/transactions/transaction-list-row';
import { useMoneyContext } from '@/features/transactions/use-money-context';
import { diffDays, monthName, monthShort, parseKey, periodFor, previousPeriod, weekday } from '@/lib/dates';
import { formatMoney, sumConverted } from '@/lib/money';
import { FocusFx } from '@/motion/focus-fx';
import { Stagger } from '@/motion/stagger';

const RECENT_COUNT = 5;
const STAGGER = { base: 200, step: 55 } as const;

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
  const recent = useRecentTransactions(RECENT_COUNT);

  const decimals = money.showDecimals ? undefined : 0;
  const balance = React.useMemo(
    () => sumConverted(accounts.map((a) => ({ minor: a.balance, currency: a.currency })), money.displayCurrency, money.rates).total,
    [accounts, money.displayCurrency, money.rates],
  );
  const fmt = (minor: number, sign: 'none' | 'auto' | 'plus' = 'none') => formatMoney(minor, money.displayCurrency, { locale: money.locale, sign, decimals });

  const now = parseKey(today);
  const end = parseKey(month.to);
  const start = parseKey(month.from);
  const left = Math.max(diffDays(today, month.to), 0);
  const previousMonth = monthName(parseKey(previousPeriod(month).to).month);
  const empty = recent.length === 0;

  return (
    <FocusFx className="flex-1 bg-bg">
      <HomeTopBar day={headerDay(weekday(today), now.day, monthShort(now.month))} remaining={daysLeftLabel(left)} />
      <ScrollView contentContainerClassName="px-4 pb-28" contentContainerStyle={empty ? { flexGrow: 1 } : undefined} showsVerticalScrollIndicator={false}>
        <SpendHero
          spend={spend}
          monthLabel={monthName(end.month)}
          previousLabel={previousMonth}
          startLabel={`${start.day} ${monthShort(start.month)}`}
          endLabel={`${end.day} ${monthShort(end.month)}`}
          locale={money.locale}
          showDecimals={money.showDecimals}
        />
        {empty ? (
          <EmptyState message="No transactions yet" actionLabel="Add transaction" onAction={() => router.push('/transaction/new')} />
        ) : (
          <>
            <Stagger index={0} {...STAGGER} className="mt-[22px]">
              <QuickAdd />
            </Stagger>
            <Stagger index={1} {...STAGGER} className="mt-5">
              <StatRow
                earned={fmt(spend.earned, spend.earned > 0 ? 'plus' : 'none')}
                perDay={fmt(spend.perDay)}
                balance={fmt(balance, 'auto')}
                balanceNegative={balance < 0}
              />
            </Stagger>
            <Stagger index={2} {...STAGGER} className="mt-[26px]">
              <ComingUp todayKey={today} locale={money.locale} showDecimals={money.showDecimals} />
            </Stagger>
            <Stagger index={3} {...STAGGER} className="mt-[26px]">
              <TopCategories insights={insights} locale={money.locale} showDecimals={money.showDecimals} />
            </Stagger>
            <Stagger index={4} {...STAGGER} className="mt-[26px]">
              <HomeSectionHeader title="Recent" actionLabel="All" onAction={() => router.navigate('/activity')} />
              <Card className="rounded-[20px] p-0">
                {recent.map((item, index) => (
                  <TransactionListRow key={item.id} item={item} context={money} separator={index < recent.length - 1} />
                ))}
              </Card>
            </Stagger>
          </>
        )}
      </ScrollView>
      <AddFab />
    </FocusFx>
  );
}
