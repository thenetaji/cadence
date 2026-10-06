import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import { Alert, ScrollView, View } from 'react-native';

import { Amount } from '@/components/app/amount';
import { ListGroup, ListRow } from '@/components/app/list-group';
import { showToast } from '@/components/app/toast-store';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { useActions } from '@/data/actions';
import { useRateLookup, useTagTotals, useTagTransactions, useTags } from '@/data/hooks';
import { TransactionListRow } from '@/features/transactions/transaction-list-row';
import { useMoneyContext } from '@/features/transactions/use-money-context';
import { ALL_DATES } from '@studio/dates';
import { convertWithRates, formatMoney, formatMoneyForSpeech } from '@studio/money';
import { Stagger } from '@/motion/stagger';
import { haptic } from '@/theme/haptics';
import { useTokens } from '@/theme/use-tokens';

import { categoryBreakdown, tagColorKey } from './model';
import { TagPill } from './tag-pill';

const ALL = { from: ALL_DATES.from, to: ALL_DATES.to };

/** One tag: total spend, where it went by category, and its transactions. */
export function TagScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const actions = useActions();
  const { category } = useTokens();
  const money = useMoneyContext({ relativeDays: true });
  const rates = useRateLookup();
  const tags = useTags();
  const totals = useTagTotals(ALL);
  const items = useTagTransactions(id);
  const tag = tags.find((t) => t.id === id);
  const total = totals.find((t) => t.tag.id === id);
  const leaving = React.useRef(false);

  React.useEffect(() => {
    if (!tag && !leaving.current && router.canGoBack()) router.back();
  }, [tag, router]);

  const breakdown = React.useMemo(
    () => categoryBreakdown(items, (minor, currency) => convertWithRates(minor, currency, money.displayCurrency, rates)),
    [items, money.displayCurrency, rates],
  );

  if (!tag) return <View className="flex-1 bg-bg" />;

  const decimals = money.showDecimals ? undefined : 0;
  const currency = total?.currency ?? money.displayCurrency;
  const fmt = (minor: number) => formatMoney(minor, currency, { locale: money.locale, sign: 'none', decimals });
  const count = total?.count ?? 0;

  const remove = () =>
    Alert.alert(`Delete ${tag.name}?`, 'Transactions keep everything else.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          leaving.current = true;
          actions.tags.delete(tag.id);
          haptic('success');
          showToast({ message: 'Tag deleted', haptic: false });
          if (router.canGoBack()) router.back();
        },
      },
    ]);

  return (
    <ScrollView className="flex-1 bg-bg" contentInsetAdjustmentBehavior="automatic" contentContainerClassName="gap-6 pb-12">
      <Stack.Screen options={{ title: '' }} />
      <Stagger index={0} className="items-center gap-1 px-6 pt-4">
        <TagPill name={tag.name} color={tag.color} size="md" />
        <View className="pt-2">
          <Amount value={fmt(total?.spent ?? 0)} variant="hero" animate="intro" accessibilityLabel={`${tag.name}, spent ${formatMoneyForSpeech(total?.spent ?? 0, currency, { sign: 'none', locale: money.locale })}`} />
        </View>
        <Text variant="footnote" tone="secondary" numeric>
          {count === 0 ? 'No transactions' : count === 1 ? '1 transaction' : `${count} transactions`}
          {total && total.earned > 0 ? ` · ${fmt(total.earned)} earned` : ''}
        </Text>
      </Stagger>

      {breakdown.length > 0 ? (
        <Stagger index={1}>
          <Text variant="footnote" tone="secondary" className="px-8 pb-2">
            By category
          </Text>
          <Card className="mx-4 gap-4">
            {breakdown.slice(0, 5).map((row) => (
              <View key={row.id} className="gap-1.5" accessible accessibilityLabel={`${row.name}, ${fmt(row.amount)}`}>
                <View className="flex-row items-center justify-between">
                  <Text variant="subhead" numberOfLines={1} className="mr-3 flex-1">
                    {row.name}
                  </Text>
                  <Text variant="subhead" numeric tone="secondary">
                    {fmt(row.amount)}
                  </Text>
                </View>
                <View style={{ height: 6, borderRadius: 3, overflow: 'hidden' }} className="bg-fill">
                  <View style={{ height: 6, borderRadius: 3, width: `${Math.max(row.share * 100, 4)}%`, backgroundColor: category[tagColorKey(row.color)] }} />
                </View>
              </View>
            ))}
          </Card>
        </Stagger>
      ) : null}

      {items.length > 0 ? (
        <Stagger index={2}>
          <Text variant="footnote" tone="secondary" className="px-8 pb-2">
            Transactions
          </Text>
          <Card className="mx-4 p-0">
            {items.slice(0, 100).map((item, i, list) => (
              <TransactionListRow key={item.id} item={item} context={money} separator={i < list.length - 1} />
            ))}
          </Card>
        </Stagger>
      ) : null}

      <Stagger index={3}>
        <ListGroup>
          <ListRow label="Delete tag" destructive centered onPress={remove} />
        </ListGroup>
      </Stagger>
    </ScrollView>
  );
}
