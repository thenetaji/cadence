import * as React from 'react';
import { ScrollView, View } from 'react-native';

import { EdgeFade } from '@/features/transaction-form/edge-fade';
import { useTokens } from '@/theme/use-tokens';
import { CategoryPill, FormChip } from '@/features/transaction-form/chips';
import { ShakeView } from '@/features/transaction-form/shake-view';
import type { CategoryRow } from '@/db/schema';
import type { CategoryColorKey } from '@/theme/tokens';

const MAX_RECENTS = 6;

type CategoryRowProps = {
  recents: readonly CategoryRow[];
  selected: CategoryRow | undefined;
  shakeTrigger: number;
  onSelect: (id: string) => void;
  onAll: () => void;
  onSplit: () => void;
};

/** Selected category first, then up to 6 recents, then "All". "Split" sits at the trailing edge. */
function CategoryRowView({ recents, selected, shakeTrigger, onSelect, onAll, onSplit }: CategoryRowProps) {
  const { colors } = useTokens();
  const others = recents.filter((c) => c.id !== selected?.id).slice(0, MAX_RECENTS);
  const chips = selected ? [selected, ...others] : others;
  return (
    <ShakeView trigger={shakeTrigger}>
      <View className="h-14">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          className="flex-1"
          contentContainerClassName="items-center gap-2 pl-4 pr-8"
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
          <FormChip label="All" icon="square.grid.2x2" onPress={onAll} accessibilityLabel="All categories" />
          <FormChip label="Split" icon="square.split.2x1" onPress={onSplit} accessibilityLabel="Split between categories" />
        </ScrollView>
        <EdgeFade color={colors.surface} />
      </View>
    </ShakeView>
  );
}

export { CategoryRowView };
