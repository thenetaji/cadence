import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import { ScrollView, View } from 'react-native';

import { IconTile } from '@/components/app/icon-tile';
import { ListGroup } from '@/components/app/list-group';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useRecurringRule, useTransaction } from '@/data/hooks';
import { DetailRow } from '@/features/transactions/detail-row';
import { repeatLabel } from '@/features/transactions/repeat-label';
import { formatTime } from '@/features/transactions/row-model';
import { useMoneyContext } from '@/features/transactions/use-money-context';
import { useTransactionActions } from '@/features/transactions/use-transaction-actions';
import { fullDayLabel } from '@/lib/dates';
import { convertWithRates, formatMoney, formatMoneyForSpeech, type SignMode } from '@/lib/money';
import type { CategoryColorKey } from '@/theme/tokens';

const SIGN: Record<'expense' | 'income' | 'transfer', SignMode> = { expense: 'minus', income: 'plus', transfer: 'none' };

function EditButton({ id }: { id: string }) {
  const actions = useTransactionActions();
  return (
    <Button variant="plainText" size="sm" onPress={() => actions.edit(id)}>
      Edit
    </Button>
  );
}

export default function TransactionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const item = useTransaction(id);
  const rule = useRecurringRule(item?.recurringRuleId);
  const money = useMoneyContext();
  const actions = useTransactionActions();
  const leaving = React.useRef(false);

  // Deleted elsewhere while open: pop back.
  React.useEffect(() => {
    if (!item && !leaving.current && router.canGoBack()) router.back();
  }, [item, router]);

  const itemId = item?.id;
  const headerOptions = React.useMemo(() => ({ title: '', headerRight: () => (itemId ? <EditButton id={itemId} /> : null) }), [itemId]);

  if (!item) return <View className="flex-1 bg-bg" />;

  const { displayCurrency, locale, rates } = money;
  const sign = SIGN[item.kind];
  const isTransfer = item.kind === 'transfer';
  const foreignRate = !isTransfer && item.currency !== displayCurrency ? rates(item.currency, displayCurrency) : null;
  const shownCurrency = foreignRate === null ? item.currency : displayCurrency;
  const shownMinor = foreignRate === null ? item.amount : convertWithRates(item.amount, item.currency, displayCurrency, rates);
  const amount = formatMoney(shownMinor, shownCurrency, { locale, sign });
  const split = item.splits.length > 1;
  const title = isTransfer
    ? `${item.account.name} → ${item.transferAccount?.name ?? ''}`
    : item.title || (split ? `${item.splits.length} categories` : (item.category?.name ?? 'Transaction'));
  const icon = isTransfer ? 'arrow.left.arrow.right' : ((split ? item.splits[0]?.category.icon : item.category?.icon) ?? 'tag.fill');
  const color = (isTransfer ? 'gray' : ((split ? item.splits[0]?.category.color : item.category?.color) ?? 'gray')) as CategoryColorKey;
  const date = `${fullDayLabel(item.dateKey)} · ${formatTime(item.occurredAt)}`;
  const memo = item.memo.trim();
  const fmt = (minor: number, currency: string) => formatMoney(minor, currency, { locale, sign: 'none' });

  const onDelete = () => {
    leaving.current = true;
    if (actions.remove(item.id)) {
      if (router.canGoBack()) router.back();
    } else {
      leaving.current = false;
    }
  };

  return (
    <ScrollView className="flex-1 bg-bg" contentInsetAdjustmentBehavior="automatic" contentContainerClassName="pb-12">
      <Stack.Screen options={headerOptions} />
      <View className="items-center gap-1 px-6 pb-6 pt-4">
        <View className="mb-3">
          <IconTile icon={icon} color={color} size={64} radius={32} splitBadge={split} />
        </View>
        <Text variant="title2" numberOfLines={2} className="text-center" accessibilityRole="header">
          {title}
        </Text>
        <Text
          variant="largeTitle"
          numeric
          tone={item.kind === 'income' ? 'income' : 'default'}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          className="font-semibold"
          accessibilityLabel={formatMoneyForSpeech(shownMinor, shownCurrency, { sign })}
        >
          {amount}
        </Text>
        <Text variant="footnote" tone="secondary" numeric>
          {date}
        </Text>
      </View>

      <View className="gap-5">
        {split ? (
          <ListGroup header="Split">
            {item.splits.map((line) => (
              <DetailRow
                key={line.id}
                label={line.category.name}
                value={fmt(line.amount, item.currency)}
                numeric
                leading={{ icon: line.category.icon, color: line.category.color as CategoryColorKey }}
              />
            ))}
          </ListGroup>
        ) : null}

        <ListGroup>
          {!split && !isTransfer && item.category ? (
            <DetailRow label="Category" value={item.category.name} tile={{ icon: item.category.icon, color: item.category.color as CategoryColorKey }} />
          ) : null}
          {isTransfer ? (
            <DetailRow
              label="From"
              value={item.account.name}
              caption={fmt(item.amount, item.currency)}
              tile={{ icon: item.account.icon, color: item.account.color as CategoryColorKey }}
            />
          ) : (
            <DetailRow label="Account" value={item.account.name} tile={{ icon: item.account.icon, color: item.account.color as CategoryColorKey }} />
          )}
          {isTransfer && item.transferAccount ? (
            <DetailRow
              label="To"
              value={item.transferAccount.name}
              caption={fmt(item.transferAmount ?? item.amount, item.transferCurrency ?? item.currency)}
              tile={{ icon: item.transferAccount.icon, color: item.transferAccount.color as CategoryColorKey }}
            />
          ) : null}
          {foreignRate !== null ? (
            <DetailRow label="Original amount" value={`${fmt(item.amount, item.currency)} · rate ${Number(foreignRate.toFixed(4))}`} numeric />
          ) : null}
        </ListGroup>

        {memo || rule ? (
          <ListGroup>
            {memo ? <DetailRow label="Memo" value={memo} stacked /> : null}
            {rule ? (
              <DetailRow
                label="Repeats"
                value={repeatLabel(rule)}
                chevron
                onPress={() => router.push({ pathname: '/recurring/[id]', params: { id: rule.id } })}
              />
            ) : null}
          </ListGroup>
        ) : null}
      </View>

      <View className="gap-1 px-4 pt-6">
        <Button variant="secondary" size="lg" onPress={() => actions.duplicate(item.id)}>
          Duplicate
        </Button>
        <Button variant="destructiveText" size="lg" onPress={onDelete}>
          Delete
        </Button>
      </View>
    </ScrollView>
  );
}
