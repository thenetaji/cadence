import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';

import { barLeft, barRight, HeaderButton } from '@/components/app/header-button';
import { CalendarView } from '@/features/calendar/calendar-view';
import { monthOf, shiftMonth } from '@/features/calendar/grid';

import { AddFab } from '@/components/app/add-fab';
import { EmptyState } from '@/components/app/empty-state';
import { OptionPicker, type Option } from '@/components/app/option-picker';
import { SummaryStrip } from '@/components/app/summary-strip';
import { usePeriodTransactions, useSetting, useTodayKey } from '@/data/hooks';
import { FilterChips } from '@/features/activity/filter-chips';
import { activeFilterCount, useActiveFilterCount, useActivityFilters } from '@/features/activity/filter-store';
import { MonthlyCard } from '@/features/activity-chart/monthly-card';
import { MonthPill } from '@/features/activity/month-pill';
import { sumItems } from '@/features/transactions/day-groups';
import { TransactionDayList } from '@/features/transactions/transaction-day-list';
import { useMoneyContext } from '@/features/transactions/use-money-context';
import { monthName, monthShort, parseKey, periodLabel, recentMonthPeriods, type Period } from '@studio/dates';
import { formatMoney } from '@studio/money';
import { haptic } from '@studio/theme';

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
  const params = useLocalSearchParams<{ filter?: string; view?: string }>();
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
  const setPeriod = useActivityFilters((s) => s.setPeriod);
  React.useEffect(() => {
    setPeriod({ from: range.from, to: range.to });
  }, [range.from, range.to, setPeriod]);
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

  // Calendar mode: its own calendar-month state; the list keeps its period choice untouched.
  // `?view=calendar` opens in calendar mode (QA deep link).
  const [calendar, setCalendar] = React.useState(() => params.view === 'calendar');
  const [calMonth, setCalMonth] = React.useState<string | null>(null);
  const [calDay, setCalDay] = React.useState<string | null>(null);
  const currentMonth = monthOf(today);
  const shownMonth = calMonth ?? currentMonth;
  const calLabel = React.useMemo(() => {
    const { year, month: m } = parseKey(`${shownMonth}-01`);
    return `${monthShort(m)} ${year}`;
  }, [shownMonth]);
  const calOptions = React.useMemo<readonly Option<string>[]>(
    () =>
      Array.from({ length: MONTH_COUNT }, (_, i) => {
        const value = shiftMonth(currentMonth, -i);
        const { year, month: m } = parseKey(`${value}-01`);
        return { value, label: `${monthName(m)} ${year}` };
      }),
    [currentMonth],
  );
  const stepMonth = React.useCallback(
    (delta: 1 | -1) => {
      const next = shiftMonth(shownMonth, delta);
      if (next > currentMonth) return;
      haptic('selection');
      setCalMonth(next === currentMonth ? null : next);
      setCalDay(null);
    },
    [shownMonth, currentMonth],
  );
  const calendarDay = calDay ?? (shownMonth === currentMonth ? today : null);
  const jumpToNow = React.useCallback(() => (calendar ? setCalMonth(null) : setChoice(null)), [calendar]);
  const filterCount = useActiveFilterCount();
  const headerOptions = React.useMemo(
    () => ({
      ...barLeft(<MonthPill label={calendar ? calLabel : label} onPress={() => setPicking(true)} onLongPress={jumpToNow} />),
      ...barRight(
        <View className="flex-row items-center">
          <HeaderButton symbol={calendar ? 'activity' : 'calendar'} label={calendar ? 'List' : 'Calendar'} onPress={() => setCalendar((v) => !v)} />
          {calendar ? null : (
            <HeaderButton
              symbol={filterCount > 0 ? 'line.3.horizontal.decrease.circle.fill' : 'line.3.horizontal.decrease.circle'}
              label="Filters"
              onPress={() => router.push('/activity-filters')}
            />
          )}
          <HeaderButton symbol="magnifyingglass" label="Search" onPress={() => router.push('/search')} />
        </View>
      ),
    }),
    [label, calLabel, calendar, jumpToNow, filterCount, router],
  );

  const header = (
    <View className="gap-3 pb-1 pt-2">
      <MonthlyCard
        months={months}
        viewedFrom={allTime ? null : (month?.from ?? null)}
        onPick={(picked) => setChoice(picked.from === months[0]?.from ? null : picked.from)}
        locale={money.locale}
      />
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
      {calendar ? (
        <CalendarView month={shownMonth} selected={calendarDay} onSelect={setCalDay} onStep={stepMonth} />
      ) : items.length === 0 ? (
        <View className="flex-1">
          {header}
          {empty}
        </View>
      ) : (
        <TransactionDayList items={items} context={money} header={header} contentContainerStyle={{ paddingBottom: 96 }} />
      )}
      <AddFab />
      <OptionPicker
        visible={picking && !calendar}
        title="Period"
        options={options}
        selected={selected}
        onSelect={(value) => setChoice(value === months[0]?.from ? null : value)}
        onClose={() => setPicking(false)}
      />
      <OptionPicker
        visible={picking && calendar}
        title="Month"
        options={calOptions}
        selected={shownMonth}
        onSelect={(value) => {
          setCalMonth(value === currentMonth ? null : value);
          setCalDay(null);
        }}
        onClose={() => setPicking(false)}
      />
    </View>
  );
}
