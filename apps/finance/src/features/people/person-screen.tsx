import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import { ScrollView, View } from 'react-native';

import { Amount } from '@/components/app/amount';
import { TransactionRow } from '@/components/app/transaction-row';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { usePersonHistory } from '@/data/hooks';
import { toRowModel } from '@/features/transactions/row-model';
import { useMoneyContext } from '@/features/transactions/use-money-context';
import { formatMoney, formatMoneyForSpeech } from '@studio/money';
import { Stagger } from '@/motion/stagger';

import { Avatar } from './avatar';

/** One person: the balance, a Settle up button, and every lending row with the balance after it. */
export function PersonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const money = useMoneyContext();
  const history = usePersonHistory(id);

  React.useEffect(() => {
    if (!history && router.canGoBack()) router.back();
  }, [history, router]);

  if (!history) return <View className="flex-1 bg-bg" />;

  const decimals = money.showDecimals ? undefined : 0;
  const { person, balances } = history;
  const settled = balances.length === 0;
  const single = balances.length === 1 ? balances[0] : undefined;
  const heroCurrency = single?.currency ?? history.currency;
  const heroMinor = single ? single.amount : history.total;
  const owed = heroMinor > 0;
  const hero = formatMoney(Math.abs(heroMinor), heroCurrency, { locale: money.locale, sign: 'none', decimals });
  const caption = settled ? 'All settled' : owed ? 'owes you' : 'you owe';

  return (
    <ScrollView className="flex-1 bg-bg" contentInsetAdjustmentBehavior="automatic" contentContainerClassName="gap-6 pb-12">
      <Stack.Screen options={{ title: '' }} />
      <Stagger index={0} className="items-center gap-1 px-6 pt-4">
        <View className="mb-3">
          <Avatar name={person.name} size={64} />
        </View>
        <Text variant="title2" numberOfLines={1} accessibilityRole="header">
          {person.name}
        </Text>
        <Text variant="footnote" tone="secondary">
          {caption}
        </Text>
        <Amount
          value={settled ? formatMoney(0, history.currency, { locale: money.locale, sign: 'none', decimals }) : hero}
          variant="hero"
          animate="intro"
          tone={settled ? 'tertiary' : owed ? 'income' : 'default'}
          accessibilityLabel={`${person.name}, ${caption}, ${formatMoneyForSpeech(Math.abs(heroMinor), heroCurrency, { sign: 'none', locale: money.locale })}`}
        />
        {balances.length > 1
          ? balances.map((b) => (
              <Text key={b.currency} variant="footnote" tone="secondary" numeric>
                {b.amount > 0 ? 'owes you' : 'you owe'} {formatMoney(Math.abs(b.amount), b.currency, { locale: money.locale, sign: 'none', decimals })}
              </Text>
            ))
          : null}
      </Stagger>

      {settled ? null : (
        <Stagger index={1} className="px-4">
          <Button size="lg" onPress={() => router.push({ pathname: '/people/[id]/settle', params: { id: person.id } })} accessibilityLabel="Settle up">
            Settle up
          </Button>
        </Stagger>
      )}

      <Stagger index={2}>
        <Text variant="footnote" tone="secondary" className="px-8 pb-2">
          History
        </Text>
        <Card className="mx-4 p-0">
          {history.entries.map((entry, i) => {
            const model = toRowModel(entry.item, money);
            const after = entry.balanceAfter;
            const left = after === 0 ? 'Settled' : `${formatMoney(Math.abs(after), entry.item.currency, { locale: money.locale, sign: 'none', decimals })} left`;
            return (
              <TransactionRow
                key={entry.item.id}
                kind={model.kind}
                title={model.title}
                subtitle={model.subtitle}
                amount={model.amount}
                trailing={left}
                icon={model.icon}
                color={model.color}
                badges={model.badges}
                accessibilityLabel={`${model.accessibilityLabel}, ${left}`}
                separator={i < history.entries.length - 1}
                onPress={() => router.push({ pathname: '/transaction/[id]', params: { id: entry.item.id } })}
              />
            );
          })}
        </Card>
      </Stagger>
    </ScrollView>
  );
}
