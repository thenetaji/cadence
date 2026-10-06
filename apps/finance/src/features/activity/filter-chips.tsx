import { ScrollView } from 'react-native';

import { Chip } from '@/components/app/chip';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { useAccounts, useCategories } from '@/data/hooks';
import type { TransactionKind } from '@/db/schema';

import { useActivityFilters } from './filter-store';

const KIND_LABEL: Record<TransactionKind, string> = {
  expense: 'Expense',
  income: 'Income',
  transfer: 'Transfer',
  lent: 'Lent',
  borrowed: 'Borrowed',
  repaid_to_me: 'Repaid to me',
  repaid_by_me: 'Repaid by me',
};

/** Active filters as removable chips plus Clear. Renders nothing when no filter is set. */
function FilterChips() {
  const kinds = useActivityFilters((s) => s.kinds);
  const categoryId = useActivityFilters((s) => s.categoryId);
  const accountId = useActivityFilters((s) => s.accountId);
  const toggleKind = useActivityFilters((s) => s.toggleKind);
  const setCategory = useActivityFilters((s) => s.setCategory);
  const setAccount = useActivityFilters((s) => s.setAccount);
  const clear = useActivityFilters((s) => s.clear);
  const categories = useCategories();
  const accounts = useAccounts({ includeArchived: true });

  const category = categoryId ? categories.find((c) => c.id === categoryId) : undefined;
  const account = accountId ? accounts.find((a) => a.id === accountId) : undefined;
  if (kinds.length === 0 && !category && !account) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="items-center gap-2 px-4 py-1" keyboardShouldPersistTaps="handled">
      {kinds.map((kind) => (
        <Chip key={kind} label={KIND_LABEL[kind]} selected onPress={() => toggleKind(kind)} />
      ))}
      {category ? <Chip label={category.name} icon={category.icon} selected onPress={() => setCategory(null)} /> : null}
      {account ? <Chip label={account.name} icon={account.icon} selected onPress={() => setAccount(null)} /> : null}
      <Pressable role="button" scale={1} dimTo={0.6} onPress={clear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} className="h-8 justify-center px-2">
        <Text variant="callout" tone="accent">
          Clear
        </Text>
      </Pressable>
    </ScrollView>
  );
}

export { FilterChips };
