import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { IconTile } from '@/components/app/icon-tile';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { formatMoney, formatMoneyForSpeech } from '@/lib/money';
import { durations, type CategoryColorKey } from '@/theme/tokens';
import { useTokens } from '@/theme/use-tokens';

export type CategoryListItem = {
  /** Category id; null for uncategorised lines (not drillable). */
  id: string | null;
  name: string;
  icon: string;
  color: CategoryColorKey;
  amount: number;
  percent: number;
};

type CategoryListProps = {
  items: readonly CategoryListItem[];
  currency: string;
  locale?: string;
  showDecimals: boolean;
  onPress: (item: CategoryListItem) => void;
};

function CategoryRow({ item, currency, locale, showDecimals, last, onPress }: Omit<CategoryListProps, 'items' | 'onPress'> & { item: CategoryListItem; last: boolean; onPress: () => void }) {
  const { colors, category } = useTokens();
  const amount = formatMoney(item.amount, currency, { locale, decimals: showDecimals ? undefined : 0 });
  const share = Math.max(0, Math.min(1, item.percent / 100));
  return (
    <Pressable
      role="button"
      disabled={item.id === null}
      accessibilityLabel={`${item.name}, ${formatMoneyForSpeech(item.amount, currency, { sign: 'none' })}, ${item.percent} percent`}
      onPress={onPress}
      scale={1}
      className="min-h-[60px] flex-row items-center bg-surface px-4 py-2.5 active:bg-fill"
    >
      <IconTile icon={item.icon} color={item.color} />
      <View className="ml-3 flex-1">
        <Text variant="body" numberOfLines={1}>
          {item.name}
        </Text>
        <View className="mt-1.5 h-1 overflow-hidden rounded-full" style={{ backgroundColor: colors.fill }}>
          <View style={{ width: `${Math.max(share * 100, share > 0 ? 2 : 0)}%`, backgroundColor: category[item.color], height: 4, borderRadius: 2 }} />
        </View>
      </View>
      <View className="ml-4 items-end" style={{ minWidth: 72 }}>
        <Text variant="body" numeric numberOfLines={1} className="font-medium">
          {amount}
        </Text>
        <Text variant="footnote" tone="tertiary" numeric>
          {item.percent}%
        </Text>
      </View>
      {last ? null : (
        <View pointerEvents="none" style={{ left: 64, height: StyleSheet.hairlineWidth, backgroundColor: colors.separator }} className="absolute bottom-0 right-0" />
      )}
    </Pressable>
  );
}

/** One row per category: icon, name, share bar, amount and percent. */
function CategoryList({ items, currency, locale, showDecimals, onPress }: CategoryListProps) {
  return (
    <>
      {items.map((item, index) => (
        <Animated.View key={item.id ?? 'none'} layout={LinearTransition.duration(durations.row)}>
          <CategoryRow
            item={item}
            currency={currency}
            locale={locale}
            showDecimals={showDecimals}
            last={index === items.length - 1}
            onPress={() => onPress(item)}
          />
        </Animated.View>
      ))}
    </>
  );
}

export { CategoryList };
