import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';

import { AddFab } from '@/components/app/add-fab';
import { EmptyState } from '@/components/app/empty-state';
import { OptionPicker, type Option } from '@/components/app/option-picker';
import { SummaryStrip } from '@/components/app/summary-strip';
import { usePeriodTransactions, useSetting, useTodayKey } from '@/data/hooks';
import { FilterChips } from '@/features/activity/filter-chips';
import { activeFilterCount, useActivityFilters } from '@/features/activity/filter-store';
import { MonthPill } from '@/features/activity/month-pill';
import { sumItems } from '@/features/transactions/day-groups';
import { TransactionDayList } from '@/features/transactions/transaction-day-list';
import { useMoneyContext } from '@/features/transactions/use-money-context';
import { monthName, monthShort, parseKey, periodLabel, recentMonthPeriods, type Period } from '@/lib/dates';
import { formatMoney } from '@/lib/money';

const ALL = 'all';
const ALL_TIME = { from: '0000-01-01', to: '9999-12-31' };
const MONTH_COUNT = 24;

function pillLabel(period: Period): string {
  const end = parseKey(period.to);
  return `${monthShort(end.month)} ${end.year}`;
}

export default function Activity() {
  const router = useRouter();
  const money = useMoneyContext();
  const today = useTodayKey();
  const [weekStart] = useSetting('week_start');
  const [monthStart] = useSetting('month_start');
  const months = React.useMemo(() => recentMonthPeriods(today, MONTH_COUNT, { weekStart, monthStart }), [today, weekStart, monthStart]);
  const [choice, setChoice] = React.useState<string | null>(null);
  const [picking, setPicking] = React.useState(false);

  const kinds = useActivityFilters((s) => s.kinds);
  const categoryId = useActivityFilters((s) => s.categoryId);
  const accountId = useActivityFilters((s) => s.accountId);
  const clear = useActivityFilters((s) => s.clear);
  const params = useLocalSearchParams<{ filter?: string }>();
  React.useEffect(() => {
    // Deep link / QA: `?filter=expense` opens with that type filter on.
    const kind = params.filter;
    if (kind === 'expense' || kind === 'income' || kind === 'transfer') {
      useActivityFilters.getState().clear();
      useActivityFilters.getState().toggleKind(kind);
    }
  }, [params.filter]);
  const filtersActive = activeFilterCount({ kinds, categoryId, accountId }) > 0;

  const allTime = choice === ALL;
  const month = (allTime ? undefined : months.find((m) => m.from === choice)) ?? months[0];
  const range = allTime || !month ? ALL_TIME : { from: month.from, to: month.to };
  const items = usePeriodTransactions({
    ...range,
    kinds: kinds.length > 0 ? kinds : undefined,
    categoryId: categoryId ?? undefined,
    accountId: accountId ?? undefined,
  });

  const options = React.useMemo<readonly Option<string>[]>(
    () => [...months.map((m) => ({ value: m.from, label: periodLabel(m) })), { value: ALL, label: 'All time' }],
    [months],
  );
  const selected = allTime ? ALL : (month?.from ?? ALL);
  const label = allTime || !month ? 'All time' : pillLabel(month);

  const totals = React.useMemo(() => sumItems(items, money), [items, money]);
  const transferOnly = kinds.length === 1 && kinds[0] === 'transfer';
  const decimals = money.showDecimals ? undefined : 0;
  const showSpent = kinds.length === 0 || kinds.includes('expense');
  const showEarned = kinds.length === 0 || kinds.includes('income');
  const summary = [
    ...(showSpent ? [{ label: 'Spent', value: formatMoney(totals.spent, money.displayCurrency, { locale: money.locale, sign: 'none', decimals }) }] : []),
    ...(showEarned
      ? [{ label: 'Earned', value: formatMoney(totals.earned, money.displayCurrency, { locale: money.locale, sign: 'none', decimals }), tone: 'income' as const }]
      : []),
  ];

  const jumpToNow = React.useCallback(() => setChoice(null), []);
  const headerOptions = React.useMemo(
    () => ({ headerLeft: () => <MonthPill label={label} onPress={() => setPicking(true)} onLongPress={jumpToNow} /> }),
    [label, jumpToNow],
  );

  const header = (
    <View className="gap-3 pb-1 pt-2">
      <FilterChips />
      {items.length > 0 && !transferOnly && summary.length > 0 ? (
        <View className="px-4">
          <SummaryStrip items={summary} />
        </View>
      ) : null}
    </View>
  );

  const empty = filtersActive ? (
    <EmptyState message="No matches" actionLabel="Clear filters" onAction={clear} />
  ) : (
    <EmptyState
      message={allTime || !month ? 'No transactions yet' : `Nothing in ${monthName(parseKey(month.to).month)}`}
      actionLabel="Add transaction"
      onAction={() => router.push('/transaction/new')}
    />
  );

  return (
    <View className="flex-1 bg-bg">
      <Stack.Screen options={headerOptions} />
      {items.length === 0 ? (
        <View className="flex-1">
          {header}
          {empty}
        </View>
      ) : (
        <TransactionDayList items={items} context={money} header={header} contentContainerStyle={{ paddingBottom: 96 }} />
      )}
      <AddFab />
      <OptionPicker
        visible={picking}
        title="Period"
        options={options}
        selected={selected}
        onSelect={(value) => setChoice(value === months[0]?.from ? null : value)}
        onClose={() => setPicking(false)}
      />
    </View>
  );
}
