import * as React from 'react';
import { ScrollView, View } from 'react-native';

import { EdgeFade } from '@/components/app/edge-fade';
import { useTokens } from '@studio/theme';
import { CategoryPill, FormChip } from '@/features/transaction-form/chips';
import { ShakeView } from '@/features/transaction-form/shake-view';
import type { CategoryRow } from '@/db/schema';
import type { CategoryColorKey } from '@studio/theme';

const MAX_RECENTS = 6;

type CategoryRowProps = {
  recents: readonly CategoryRow[];
  selected: CategoryRow | undefined;
  shakeTrigger: number;
  onSelect: (id: string) => void;
  onAll: () => void;
};

/** Selected category first, then up to 6 recents, then "All". "All" is a fixed icon pill pinned outside the scroller. */
function CategoryRowView({ recents, selected, shakeTrigger, onSelect, onAll }: CategoryRowProps) {
  const { colors } = useTokens();
  const others = recents.filter((c) => c.id !== selected?.id).slice(0, MAX_RECENTS);
  const chips = selected ? [selected, ...others] : others;
  return (
    <ShakeView trigger={shakeTrigger}>
      <View className="h-14 flex-row items-center">
        <View className="h-14 min-w-0 flex-1">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            className="flex-1"
            contentContainerClassName="items-center gap-2 pl-4 pr-6"
          >
            {chips.map((category) => (
              <CategoryPill
                key={category.id}
                name={category.name}
                icon={category.icon}
                color={category.color as CategoryColorKey}
                selected={category.id === selected?.id}
                onPress={() => onSelect(category.id)}
              />
            ))}
          </ScrollView>
          <EdgeFade color={colors.surface} />
        </View>
        <View className="h-14 items-center justify-center pl-2 pr-4">
          <FormChip label="All categories" icon="square.grid.2x2" iconOnly onPress={onAll} accessibilityLabel="All categories" />
        </View>
      </View>
    </ShakeView>
  );
}

export { CategoryRowView };
