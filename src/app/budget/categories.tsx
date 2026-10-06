import { useRouter } from 'expo-router';
import * as React from 'react';
import { ScrollView, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useCategories } from '@/data/hooks';
import { CategoryGrid } from '@/features/entry/category-grid';
import { useCategoryRequest } from '@/features/budgets/category-store';

/** Category grid sheet for a budget: multi-select, applied live; stays open until Done. */
export default function BudgetCategorySheet() {
  const router = useRouter();
  const request = useCategoryRequest((s) => s.request);
  const close = useCategoryRequest((s) => s.close);
  const categories = useCategories('expense');
  const [selected, setSelected] = React.useState<string[]>(() => [...(request?.selected ?? [])]);

  const toggle = (id: string) => {
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
    setSelected(next);
    request?.onChange(next);
  };
  const done = () => {
    close();
    router.back();
  };

  return (
    <View className="flex-1 bg-bg pt-2">
      <View className="h-12 flex-row items-center px-2">
        <View className="w-20" />
        <Text variant="headline" accessibilityRole="header" className="flex-1 text-center">
          Categories
        </Text>
        <View className="w-20 items-end">
          <Button variant="plainText" size="sm" onPress={done} accessibilityLabel="Done">
            <Text variant="body" className="font-semibold">
              Done
            </Text>
          </Button>
        </View>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-8">
        <CategoryGrid categories={categories} selected={selected} onToggle={toggle} />
      </ScrollView>
    </View>
  );
}
