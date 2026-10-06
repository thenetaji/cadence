import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import { Platform, View } from 'react-native';

import { Amount } from '@/components/app/amount';
import { EmptyState } from '@/components/app/empty-state';
import { OptionPicker, type Option } from '@/components/app/option-picker';
import { barRight } from '@/components/app/header-button';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useAccounts, usePeriodTransactions, useSetting, useTodayKey } from '@/data/hooks';
import { MonthPill } from '@/features/activity/month-pill';
import { TransactionDayList } from '@/features/transactions/transaction-day-list';
import { useMoneyContext } from '@/features/transactions/use-money-context';
import { monthName, monthShort, parseKey, periodLabel, recentMonthPeriods } from '@/lib/dates';
import { convertWithRates, formatMoney, formatMoneyForSpeech } from '@/lib/money';

const ALL = 'all';
const ALL_TIME = { from: '0000-01-01', to: '9999-12-31' };

/** Account detail: hero balance, Transfer and Edit, then the account's transactions one month at a time. */
export default function AccountDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const money = useMoneyContext({ relativeDays: true });
  const today = useTodayKey();
  const accounts = useAccounts({ includeArchived: true });
  const [weekStart] = useSetting('week_start');
  const [monthStart] = useSetting('month_start');
  const months = React.useMemo(() => recentMonthPeriods(today, 24, { weekStart, monthStart }), [today, weekStart, monthStart]);
  const [choice, setChoice] = React.useState<string | null>(null);
  const [picking, setPicking] = React.useState(false);

  const account = accounts.find((a) => a.id === id);
  const allTime = choice === ALL;
  const month = (allTime ? undefined : months.find((m) => m.from === choice)) ?? months[0];
  const range = allTime || !month ? ALL_TIME : { from: month.from, to: month.to };
  const items = usePeriodTransactions({ ...range, accountId: id });
  const options = React.useMemo<readonly Option<string>[]>(
    () => [...months.map((m) => ({ value: m.from, label: periodLabel(m) })), { value: ALL, label: 'All time' }],
    [months],
  );

  if (!account) {
    return (
      <View className="flex-1 justify-center bg-bg">
        <Stack.Screen options={{ title: 'Account' }} />
        <EmptyState message="Account not found" actionLabel="Back" onAction={() => router.back()} />
      </View>
    );
  }

  const decimals = money.showDecimals ? undefined : 0;
  const label = allTime || !month ? 'All time' : `${monthShort(parseKey(month.to).month)} ${parseKey(month.to).year}`;
  const foreign = account.currency !== money.displayCurrency && money.rates(account.currency, money.displayCurrency) !== null;
  const converted = foreign
    ? `≈ ${formatMoney(convertWithRates(account.balance, account.currency, money.displayCurrency, money.rates), money.displayCurrency, { locale: money.locale, decimals })}`
    : null;

  const header = (
    <View className="gap-4 pb-1 pt-2">
      <View className="px-4">
        <Text variant="footnote" tone="secondary">
          Balance
        </Text>
        <Amount
          value={formatMoney(account.balance, account.currency, { locale: money.locale, decimals })}
          variant="hero"
          animate="intro"
          tone={account.balance < 0 ? 'expense' : 'default'}
          accessibilityLabel={`Balance, ${formatMoneyForSpeech(account.balance, account.currency, { locale: money.locale })}`}
        />
        {converted ? (
          <Text variant="subhead" tone="secondary" numeric>
            {converted}
          </Text>
        ) : null}
      </View>
      <View className="px-4">
        <Button
          variant="secondary"
          onPress={() => router.push({ pathname: '/transaction/new', params: { kind: 'transfer', accountId: account.id } })}
        >
          Transfer
        </Button>
      </View>
      <View className="flex-row items-center px-4 pt-1" style={Platform.OS === 'web' ? { marginLeft: -16 } : undefined}>
        <MonthPill label={label} onPress={() => setPicking(true)} />
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-bg">
      <Stack.Screen
        options={{
          title: account.name,
          ...barRight(
            <Button variant="barPrimary" size="sm" onPress={() => router.push({ pathname: '/accounts/[id]/edit', params: { id: account.id } })} accessibilityLabel="Edit">
              <Text variant="body">Edit</Text>
            </Button>
          ),
        }}
      />
      <TransactionDayList
        items={items}
        context={money}
        header={header}
        empty={
          <EmptyState
            message={allTime || !month ? 'No transactions yet' : `Nothing in ${monthName(parseKey(month.to).month)}`}
            actionLabel="Add transaction"
            onAction={() => router.push({ pathname: '/transaction/new', params: { accountId: account.id } })}
          />
        }
        contentContainerStyle={{ paddingBottom: 32 }}
      />
      <OptionPicker
        visible={picking}
        title="Period"
        options={options}
        selected={allTime ? ALL : (month?.from ?? ALL)}
        onSelect={(value) => setChoice(value === months[0]?.from ? null : value)}
        onClose={() => setPicking(false)}
      />
    </View>
  );
}
