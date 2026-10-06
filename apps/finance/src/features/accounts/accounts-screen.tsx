import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as React from 'react';
import { ScrollView, View } from 'react-native';

import { Amount } from '@/components/app/amount';
import { EmptyState } from '@/components/app/empty-state';
import { HeaderButton, barRight } from '@/components/app/header-button';
import { AppIcon } from '@studio/icons';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { useActions } from '@/data/actions';
import { useAccounts, useRateLookup, useSetting } from '@/data/hooks';
import { moneyLocale } from '@/features/transactions/use-money-context';
import { formatMoney, formatMoneyForSpeech, maskLocale, minorDigits } from '@studio/money';
import { useTokens } from '@studio/theme';

import { AccountRow, ACCOUNT_ROW_HEIGHT } from './account-row';
import { toAccountView, totalInDisplay } from './model';
import { ReorderList } from './reorder-list';

const COMPACT_FROM = 1e7;

/** Accounts list: hero total in the display currency, rows, an Edit mode that reorders, and a collapsed Archived group. */
export function AccountsScreen() {
  const router = useRouter();
  const actions = useActions();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const { colors } = useTokens();
  const [displayCurrency] = useSetting('display_currency');
  const [showDecimals] = useSetting('show_decimals');
  const rates = useRateLookup();
  const all = useAccounts({ includeArchived: true });
  const [editing, setEditing] = React.useState(edit === '1');
  const [showArchived, setShowArchived] = React.useState(false);

  const active = React.useMemo(() => all.filter((a) => !a.archivedAt), [all]);
  const archived = React.useMemo(() => all.filter((a) => a.archivedAt), [all]);
  const [hidden] = useSetting('hide_amounts');
  const locale = maskLocale(moneyLocale(displayCurrency), hidden);
  const fmt = React.useMemo(() => ({ displayCurrency, rates, locale, showDecimals }), [displayCurrency, rates, locale, showDecimals]);
  const views = React.useMemo(() => active.map((a) => toAccountView(a, fmt)), [active, fmt]);
  const archivedViews = React.useMemo(() => archived.map((a) => toAccountView(a, fmt)), [archived, fmt]);
  const { total, excluded } = totalInDisplay(active, fmt);
  const compact = Math.abs(total) / 10 ** minorDigits(displayCurrency) >= COMPACT_FROM;
  const totalText = formatMoney(total, displayCurrency, { locale, compact, decimals: showDecimals ? undefined : 0 });

  const add = () => router.push('/accounts/new');
  const open = (id: string) => router.push(editing ? { pathname: '/accounts/[id]/edit', params: { id } } : { pathname: '/accounts/[id]', params: { id } });
  const viewById = new Map(views.map((v) => [v.id, v]));

  const header = (
    <Stack.Screen
      options={{
        title: 'Accounts',
        ...barRight(
          <View className="flex-row items-center">
            {active.length > 1 ? (
              <Button variant="barPrimary" size="sm" onPress={() => setEditing((v) => !v)} accessibilityLabel={editing ? 'Done' : 'Edit'}>
                <Text variant={editing ? 'headline' : 'body'}>{editing ? 'Done' : 'Edit'}</Text>
              </Button>
            ) : null}
            <HeaderButton symbol="plus" label="Add account" onPress={add} />
          </View>
        ),
      }}
    />
  );

  if (all.length === 0) {
    return (
      <View className="flex-1 justify-center bg-bg pb-24">
        {header}
        <EmptyState message="No accounts" actionLabel="Add account" onAction={add} />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-bg" contentInsetAdjustmentBehavior="automatic" contentContainerClassName="gap-5 pb-12 pt-2">
      {header}
      <View className="px-4">
        <Text variant="footnote" tone="secondary">
          Total
        </Text>
        <Amount value={totalText} variant="hero" animate="intro" tone={total < 0 ? 'expense' : 'default'} accessibilityLabel={`Total, ${formatMoneyForSpeech(total, displayCurrency, { locale })}`} />
        {excluded.length > 0 ? (
          <Text variant="footnote" tone="warning" numberOfLines={2}>
            Excludes {excluded.map((a) => a.name).join(', ')}: rate needed
          </Text>
        ) : null}
      </View>
      <Card className="mx-4 p-0">
        {editing ? (
          <ReorderList
            ids={active.map((a) => a.id)}
            rowHeight={ACCOUNT_ROW_HEIGHT}
            labelOf={(id) => viewById.get(id)?.name ?? ''}
            onReorder={(ids) => actions.accounts.reorder(ids)}
            renderRow={(id, handle, last) => {
              const view = viewById.get(id);
              return view ? <AccountRow view={view} separator={!last} onPress={() => open(id)} trailing={handle} /> : null;
            }}
          />
        ) : (
          views.map((view, index) => <AccountRow key={view.id} view={view} separator={index < views.length - 1} onPress={() => open(view.id)} />)
        )}
      </Card>
      {archivedViews.length > 0 ? (
        <View>
          <Pressable
            role="button"
            accessibilityLabel={`Archived, ${archivedViews.length}`}
            accessibilityState={{ expanded: showArchived }}
            scale={1}
            dimTo={0.6}
            onPress={() => setShowArchived((v) => !v)}
            className="min-h-11 flex-row items-center gap-1.5 px-4"
          >
            <Text variant="footnote" tone="secondary">
              Archived · {archivedViews.length}
            </Text>
            <AppIcon name={showArchived ? 'chevron.up' : 'chevron.down'} size={10} color={colors.textTertiary} />
          </Pressable>
          {showArchived ? (
            <Card className="mx-4 p-0" style={{ opacity: 0.6 }}>
              {archivedViews.map((view, index) => (
                <AccountRow key={view.id} view={view} separator={index < archivedViews.length - 1} onPress={() => open(view.id)} />
              ))}
            </Card>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}
