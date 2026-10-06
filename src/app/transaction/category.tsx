import { useRouter, type Href } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { IconTile } from '@/components/app/icon-tile';
import { Button } from '@/components/ui/button';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { useCategories } from '@/data/hooks';
import { updateSplitLine } from '@/features/transaction-form/logic';
import { useDraftStore } from '@/features/transaction-form/store';
import { haptic } from '@/theme/haptics';
import type { CategoryColorKey } from '@/theme/tokens';
import { useTokens } from '@/theme/use-tokens';

/** Category grid sheet: 4 columns; writes to the draft (single category or the split line being picked). */
export default function CategorySheet() {
  const router = useRouter();
  const { colors } = useTokens();
  const { kind, categoryId, splits, pickingLine } = useDraftStore(useShallow((s) => ({ kind: s.kind, categoryId: s.categoryId, splits: s.splits, pickingLine: s.pickingLine })));
  const categories = useCategories(kind === 'income' ? 'income' : 'expense');
  const current = pickingLine ? splits?.find((l) => l.key === pickingLine)?.categoryId : categoryId;

  const choose = (id: string) => {
    haptic('selection');
    const s = useDraftStore.getState();
    if (s.pickingLine && s.splits) s.patch({ splits: updateSplitLine(s.splits, s.pickingLine, { categoryId: id }) });
    else s.patch({ categoryId: id });
    s.setPickingLine(null);
    router.back();
  };

  return (
    <View className="flex-1 bg-bg pt-2">
      <View className="h-12 flex-row items-center px-2">
        <View className="w-20 items-start">
          <Button variant="plainText" size="sm" onPress={() => router.push('/settings/categories' as Href)} accessibilityLabel="Manage categories">
            <Text variant="body">Manage</Text>
          </Button>
        </View>
        <Text variant="headline" accessibilityRole="header" className="flex-1 text-center">
          Category
        </Text>
        <View className="w-20 items-end">
          <Button variant="plainText" size="sm" onPress={() => router.back()} accessibilityLabel="Cancel">
            <Text variant="body">Cancel</Text>
          </Button>
        </View>
      </View>
      <ScrollView contentContainerClassName="flex-row flex-wrap px-2 pb-8 pt-2" showsVerticalScrollIndicator={false}>
        {categories.map((category) => {
          const selected = category.id === current;
          return (
            <View key={category.id} className="w-1/4 items-center px-1 pb-4">
              <Pressable role="button" accessibilityLabel={category.name} accessibilityState={{ selected }} onPress={() => choose(category.id)} className="w-full items-center gap-1.5">
                <View className="items-center justify-center rounded-full p-[3px]" style={selected ? { borderWidth: 2, borderColor: colors.accent } : { borderWidth: 2, borderColor: 'transparent' }}>
                  <IconTile icon={category.icon} color={category.color as CategoryColorKey} size={46} />
                </View>
                <Text variant="caption" tone={selected ? 'accent' : 'secondary'} numberOfLines={2} className="text-center">
                  {category.name}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
