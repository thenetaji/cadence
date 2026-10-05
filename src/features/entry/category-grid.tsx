import { View } from 'react-native';

import { IconTile } from '@/components/app/icon-tile';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import type { CategoryRow } from '@/db/schema';
import { haptic } from '@/theme/haptics';
import type { CategoryColorKey } from '@/theme/tokens';
import { useTokens } from '@/theme/use-tokens';

type CategoryGridProps = {
  categories: readonly CategoryRow[];
  selected: readonly string[];
  onToggle: (id: string) => void;
};

/** Four-column category tiles; a ring marks every selected one. */
function CategoryGrid({ categories, selected, onToggle }: CategoryGridProps) {
  const { colors } = useTokens();
  return (
    <View className="flex-row flex-wrap px-2 pt-2">
      {categories.map((category) => {
        const on = selected.includes(category.id);
        return (
          <View key={category.id} className="w-1/4 items-center px-1 pb-4">
            <Pressable
              role="button"
              accessibilityLabel={category.name}
              accessibilityState={{ selected: on }}
              onPress={() => {
                haptic('selection');
                onToggle(category.id);
              }}
              className="w-full items-center gap-1.5"
            >
              <View className="items-center justify-center rounded-full p-[3px]" style={{ borderWidth: 2, borderColor: on ? colors.accent : 'transparent' }}>
                <IconTile icon={category.icon} color={category.color as CategoryColorKey} size={44} radius={22} />
              </View>
              <Text variant="caption" tone={on ? 'accent' : 'secondary'} numberOfLines={2} className="text-center">
                {category.name}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

export { CategoryGrid };
