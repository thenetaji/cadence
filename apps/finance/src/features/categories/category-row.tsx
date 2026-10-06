import * as React from 'react';
import { StyleSheet, View } from 'react-native';

import { IconTile } from '@/components/app/icon-tile';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import type { CategoryRow as CategoryData } from '@/db/schema';
import { pressScale, type CategoryColorKey } from '@/theme/tokens';
import { useTokens } from '@/theme/use-tokens';

export const CATEGORY_ROW_HEIGHT = 56;

type CategoryRowProps = {
  category: CategoryData;
  separator?: boolean;
  onPress: () => void;
  /** The drag handle in edit mode. */
  trailing?: React.ReactNode;
};

/** Icon tile and name; the separator is inset past the tile. */
function CategoryRow({ category, separator = true, onPress, trailing }: CategoryRowProps) {
  const { colors } = useTokens();
  return (
    <Pressable
      role="button"
      accessibilityLabel={category.name}
      scale={pressScale.row}
      onPress={onPress}
      className="flex-row items-center bg-surface px-4"
      style={{ height: CATEGORY_ROW_HEIGHT }}
    >
      <IconTile icon={category.icon} color={category.color as CategoryColorKey} />
      <Text variant="body" numberOfLines={1} className="ml-3 flex-1">
        {category.name}
      </Text>
      {trailing}
      {separator ? (
        <View pointerEvents="none" style={{ left: 64, height: StyleSheet.hairlineWidth, backgroundColor: colors.separator }} className="absolute bottom-0 right-0" />
      ) : null}
    </Pressable>
  );
}

export { CategoryRow };
