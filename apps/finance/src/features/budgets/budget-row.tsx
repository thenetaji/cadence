import { StyleSheet, View } from 'react-native';

import { IconTile } from '@/components/app/icon-tile';
import { ProgressBar } from '@/components/app/progress-bar';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { SwipeDelete } from '@/features/entry/swipe-delete';
import { pressScale } from '@/theme/tokens';
import { useCategoryColor, useTokens } from '@/theme/use-tokens';

import type { BudgetView } from './model';

type BudgetRowProps = {
  view: BudgetView;
  separator?: boolean;
  onPress: () => void;
  onDelete: () => void;
};

const PERIOD_TAG = { weekly: 'Weekly', monthly: '', yearly: 'Yearly' } as const;

/** Category budget: tile, name, "₹2,100 of ₹5,000", and a category-coloured bar under the text. */
function BudgetRow({ view, separator = true, onPress, onDelete }: BudgetRowProps) {
  const { colors } = useTokens();
  const tint = useCategoryColor(view.color);
  const tag = PERIOD_TAG[view.period];
  return (
    <SwipeDelete onDelete={onDelete}>
      <Pressable
        role="button"
        accessibilityLabel={view.accessibilityLabel}
        accessibilityActions={[{ name: 'delete', label: 'Delete' }]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'delete') onDelete();
        }}
        scale={pressScale.row}
        onPress={onPress}
        className="min-h-[64px] flex-row items-center bg-surface px-4 py-3"
      >
        <IconTile icon={view.icon} color={view.color} />
        <View className="ml-3 flex-1 gap-1.5">
          <View className="flex-row items-baseline justify-between gap-3">
            <View className="shrink flex-row items-baseline gap-1.5">
              <Text variant="body" numberOfLines={1} className="shrink">
                {view.name}
              </Text>
              {tag ? (
                <Text variant="footnote" tone="tertiary">
                  {tag}
                </Text>
              ) : null}
            </View>
            <Text variant="subhead" tone={view.status === 'over' ? 'expense' : 'secondary'} numeric numberOfLines={1}>
              {view.progressText}
            </Text>
          </View>
          <ProgressBar value={view.ratio} color={tint} marker={view.marker} />
        </View>
        {separator ? (
          <View pointerEvents="none" style={{ left: 64, height: StyleSheet.hairlineWidth, backgroundColor: colors.separator }} className="absolute bottom-0 right-0" />
        ) : null}
      </Pressable>
    </SwipeDelete>
  );
}

export { BudgetRow };
