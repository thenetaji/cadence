import { Stack, useRouter } from 'expo-router';
import * as React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip } from '@/components/app/chip';
import { ListGroup, ListRow } from '@/components/app/list-group';
import { AppIcon } from '@/icons/app-icon';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useAccounts, useCategories, usePeriodTransactions } from '@/data/hooks';
import { activeFilterCount, useActivityFilters } from '@/features/activity/filter-store';
import { haptic } from '@/theme/haptics';
import type { CategoryColorKey } from '@/theme/tokens';
import { useTokens } from '@/theme/use-tokens';

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
  const insets = useSafeAreaInsets();
  const { colors } = useTokens();
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
      headerLeft: () => (
        <Button variant="plainText" size="sm" disabled={!active} onPress={clear}>
          Reset
        </Button>
      ),
      headerRight: () => (
        <Button variant="plainText" size="sm" onPress={() => router.back()}>
          Done
        </Button>
      ),
    }),
    [active, clear, router],
  );

  return (
    <View className="flex-1 bg-bg">
      <Stack.Screen options={headerOptions} />
      <ScrollView className="flex-1" contentContainerClassName="gap-6 pb-6 pt-2" showsVerticalScrollIndicator={false}>
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
              icon={{ name: category.icon, color: category.color as CategoryColorKey }}
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
              icon={{ name: account.icon, color: account.color as CategoryColorKey }}
              trailing={accountId === account.id ? <Check /> : undefined}
              onPress={() => {
                haptic('selection');
                setAccount(accountId === account.id ? null : account.id);
              }}
            />
          ))}
        </ListGroup>
      </ScrollView>
      <View
        className="bg-bg px-4 pt-3"
        style={{ paddingBottom: Math.max(insets.bottom, 16), borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator }}
      >
        <Button size="lg" onPress={() => router.back()} accessibilityLabel={`Show ${matches} transactions`}>
          {`Show ${matches} ${matches === 1 ? 'transaction' : 'transactions'}`}
        </Button>
      </View>
    </View>
  );
}
