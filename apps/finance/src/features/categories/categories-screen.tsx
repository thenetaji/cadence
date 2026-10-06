import { Stack, useRouter } from 'expo-router';
import * as React from 'react';
import { ScrollView, View } from 'react-native';

import { HeaderButton, barRight } from '@/components/app/header-button';
import { OptionPicker } from '@/components/app/option-picker';
import { showToast } from '@/components/app/toast-store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { useActions } from '@/data/actions';
import { useCategories } from '@/data/hooks';
import type { CategoryKind, CategoryRow as CategoryData } from '@/db/schema';
import { ReorderList } from '@/features/accounts/reorder-list';
import { SwipeDelete } from '@/features/entry/swipe-delete';

import { CATEGORY_ROW_HEIGHT, CategoryRow } from './category-row';

type SectionProps = {
  title: string;
  kind: CategoryKind;
  categories: CategoryData[];
  editing: boolean;
  onOpen: (id: string) => void;
  onDelete: (category: CategoryData) => void;
  onReorder: (ids: string[]) => void;
};

function Section({ title, categories, editing, onOpen, onDelete, onReorder }: SectionProps) {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const deletable = categories.length > 1;
  return (
    <View className="px-4">
      <Text variant="footnote" tone="secondary" className="px-4 pb-2" accessibilityRole="header">
        {title}
      </Text>
      <Card className="p-0">
        {editing ? (
          <ReorderList
            ids={categories.map((c) => c.id)}
            rowHeight={CATEGORY_ROW_HEIGHT}
            labelOf={(id) => byId.get(id)?.name ?? ''}
            onReorder={onReorder}
            renderRow={(id, handle, last) => {
              const category = byId.get(id);
              return category ? <CategoryRow category={category} separator={!last} onPress={() => onOpen(id)} trailing={handle} /> : null;
            }}
          />
        ) : (
          categories.map((category, index) => {
            const row = <CategoryRow category={category} separator={index < categories.length - 1} onPress={() => onOpen(category.id)} />;
            return deletable ? (
              <SwipeDelete key={category.id} onDelete={() => onDelete(category)}>
                {row}
              </SwipeDelete>
            ) : (
              <React.Fragment key={category.id}>{row}</React.Fragment>
            );
          })
        )}
      </Card>
    </View>
  );
}

/** Expense and Income sections; Edit reorders, swiping a row deletes after choosing where its transactions go. */
export function CategoriesScreen() {
  const router = useRouter();
  const actions = useActions();
  const expense = useCategories('expense');
  const income = useCategories('income');
  const [editing, setEditing] = React.useState(false);
  const [deleting, setDeleting] = React.useState<CategoryData | null>(null);

  const open = (id: string) => router.push({ pathname: '/settings/categories/[id]', params: { id } });
  const add = () => router.push({ pathname: '/settings/categories/[id]', params: { id: 'new' } });

  const targets = deleting ? (deleting.kind === 'income' ? income : expense).filter((c) => c.id !== deleting.id) : [];
  const move = (targetId: string | null) => {
    if (!deleting || !targetId) return;
    actions.categories.delete(deleting.id, targetId);
    showToast({ message: 'Deleted' });
  };

  return (
    <ScrollView className="flex-1 bg-bg" contentInsetAdjustmentBehavior="automatic" contentContainerClassName="gap-6 pb-12 pt-4">
      <Stack.Screen
        options={{
          title: 'Categories',
          ...barRight(
            <View className="flex-row items-center">
              <Button variant="barPrimary" size="sm" onPress={() => setEditing((v) => !v)} accessibilityLabel={editing ? 'Done' : 'Edit'}>
                <Text variant={editing ? 'headline' : 'body'}>{editing ? 'Done' : 'Edit'}</Text>
              </Button>
              <HeaderButton symbol="plus" label="Add category" onPress={add} />
            </View>
          ),
        }}
      />
      <Section
        title="Expense"
        kind="expense"
        categories={expense}
        editing={editing}
        onOpen={open}
        onDelete={setDeleting}
        onReorder={(ids) => actions.categories.reorder(ids)}
      />
      <Section
        title="Income"
        kind="income"
        categories={income}
        editing={editing}
        onOpen={open}
        onDelete={setDeleting}
        onReorder={(ids) => actions.categories.reorder(ids)}
      />
      <OptionPicker
        visible={deleting !== null}
        title="Move transactions to…"
        options={targets.map((c) => ({ value: c.id, label: c.name }))}
        selected={null}
        onSelect={move}
        onClose={() => setDeleting(null)}
      />
    </ScrollView>
  );
}
