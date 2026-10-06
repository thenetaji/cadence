import { Stack, useRouter } from 'expo-router';
import * as React from 'react';
import { ScrollView } from 'react-native';

import { SymbolIcon } from '@/components/app/symbol';
import { ListGroup, ListRow } from '@/components/app/list-group';
import { Button } from '@/components/ui/button';
import { useAccounts, useCategories } from '@/data/hooks';
import type { CategoryColorKey } from '@/theme/tokens';
import { activeFilterCount, useActivityFilters } from '@/features/activity/filter-store';
import { haptic } from '@/theme/haptics';
import { useTokens } from '@/theme/use-tokens';

const KINDS = [
  { kind: 'expense', label: 'Expense' },
  { kind: 'income', label: 'Income' },
  { kind: 'transfer', label: 'Transfer' },
] as const;

function Check() {
  const { colors } = useTokens();
  return <SymbolIcon name="checkmark" size={16} color={colors.accent} weight="semibold" />;
}

function DoneButton() {
  const router = useRouter();
  return (
    <Button variant="plainText" size="sm" onPress={() => router.back()}>
      Done
    </Button>
  );
}

export default function ActivityFilters() {
  const kinds = useActivityFilters((s) => s.kinds);
  const categoryId = useActivityFilters((s) => s.categoryId);
  const accountId = useActivityFilters((s) => s.accountId);
  const toggleKind = useActivityFilters((s) => s.toggleKind);
  const setCategory = useActivityFilters((s) => s.setCategory);
  const setAccount = useActivityFilters((s) => s.setAccount);
  const clear = useActivityFilters((s) => s.clear);
  const categories = useCategories();
  const accounts = useAccounts();
  const active = activeFilterCount({ kinds, categoryId, accountId }) > 0;

  const headerOptions = React.useMemo(
    () => ({
      headerLeft: () => (
        <Button variant="plainText" size="sm" disabled={!active} onPress={clear}>
          Reset
        </Button>
      ),
      headerRight: () => <DoneButton />,
    }),
    [active, clear],
  );

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerClassName="gap-6 pb-12 pt-4">
      <Stack.Screen options={headerOptions} />
      <ListGroup header="Type">
        {KINDS.map(({ kind, label }) => (
          <ListRow
            key={kind}
            label={label}
            trailing={kinds.includes(kind) ? <Check /> : undefined}
            onPress={() => {
              haptic('selection');
              toggleKind(kind);
            }}
          />
        ))}
      </ListGroup>
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
  );
}
