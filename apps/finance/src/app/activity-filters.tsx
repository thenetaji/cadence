import { Stack, useRouter } from 'expo-router';
import * as React from 'react';
import { ScrollView, View } from 'react-native';

import { Chip } from '@/components/app/chip';
import { ListGroup, ListRow } from '@/components/app/list-group';
import { AppIcon } from '@/icons/app-icon';
import { barLeft, barRight } from '@/components/app/header-button';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useAccounts, useCategories, usePeriodTransactions } from '@/data/hooks';
import { activeFilterCount, useActivityFilters } from '@/features/activity/filter-store';
import { haptic , useTokens } from '@studio/theme';
import type { CategoryColorKey } from '@studio/theme';

const KINDS = [
  { kind: 'expense', label: 'Expense' },
  { kind: 'income', label: 'Income' },
  { kind: 'transfer', label: 'Transfer' },
] as const;

function Check() {
  const { colors } = useTokens();
  return <AppIcon name="checkmark" size={16} color={colors.accent} />;
}

export default function ActivityFilters() {
  const router = useRouter();
  const kinds = useActivityFilters((s) => s.kinds);
  const categoryId = useActivityFilters((s) => s.categoryId);
  const accountId = useActivityFilters((s) => s.accountId);
  const period = useActivityFilters((s) => s.period);
  const toggleKind = useActivityFilters((s) => s.toggleKind);
  const setCategory = useActivityFilters((s) => s.setCategory);
  const setAccount = useActivityFilters((s) => s.setAccount);
  const clear = useActivityFilters((s) => s.clear);
  const categories = useCategories();
  const accounts = useAccounts();
  const active = activeFilterCount({ kinds, categoryId, accountId }) > 0;

  const matches = usePeriodTransactions({
    ...period,
    kinds: kinds.length > 0 ? kinds : undefined,
    categoryId: categoryId ?? undefined,
    accountId: accountId ?? undefined,
  }).length;

  const headerOptions = React.useMemo(
    () => ({
      ...barLeft(
        <Button variant="barSecondary" size="sm" disabled={!active} onPress={clear}>
          Reset
        </Button>,
      ),
      ...barRight(
        <Button variant="barPrimary" size="sm" onPress={() => router.back()}>
          Done
        </Button>,
      ),
    }),
    [active, clear, router],
  );

  return (
    // The scroll view is the sheet's only root (see SheetScroll): no sibling footer, so the sheet can resize freely.
    <ScrollView
      className="flex-1 bg-bg"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="gap-6 pb-10 pt-2"
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen options={headerOptions} />
      <View className="px-4">
        <Text variant="footnote" tone="secondary" className="px-4 pb-2" accessibilityRole="header">
          Type
        </Text>
        <View className="flex-row gap-2 px-4">
          {KINDS.map(({ kind, label }) => (
            <Chip
              key={kind}
              label={label}
              selected={kinds.includes(kind)}
              onPress={() => {
                haptic('selection');
                toggleKind(kind);
              }}
            />
          ))}
        </View>
      </View>
      <ListGroup header="Category">
        {categories.map((category) => (
          <ListRow
            key={category.id}
            label={category.name}
            icon={{
              name: category.icon,
              color: category.color as CategoryColorKey,
            }}
            trailing={categoryId === category.id ? <Check /> : undefined}
            onPress={() => {
              haptic('selection');
              setCategory(categoryId === category.id ? null : category.id);
            }}
          />
        ))}
      </ListGroup>
      <ListGroup header="Account">
        {accounts.map((account) => (
          <ListRow
            key={account.id}
            label={account.name}
            icon={{
              name: account.icon,
              color: account.color as CategoryColorKey,
            }}
            trailing={accountId === account.id ? <Check /> : undefined}
            onPress={() => {
              haptic('selection');
              setAccount(accountId === account.id ? null : account.id);
            }}
          />
        ))}
      </ListGroup>
      <View className="px-4">
        <Button size="lg" onPress={() => router.back()} accessibilityLabel={`Show ${matches} transactions`}>
          {`Show ${matches} ${matches === 1 ? 'transaction' : 'transactions'}`}
        </Button>
      </View>
    </ScrollView>
  );
}
