import * as React from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { SymbolIcon } from '@/components/app/symbol';
import { Button } from '@/components/ui/button';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { CategoryPill, FormChip, Hairline } from '@/features/transaction-form/chips';
import { MAX_SPLIT_LINES, splitRemaining, type SplitDraftLine } from '@/features/transaction-form/logic';
import { ShakeView } from '@/features/transaction-form/shake-view';
import type { CategoryRow } from '@/db/schema';
import { durations, springs, type CategoryColorKey } from '@/theme/tokens';
import { useTokens } from '@/theme/use-tokens';

type SplitListProps = {
  lines: readonly SplitDraftLine[];
  total: number;
  categories: readonly CategoryRow[];
  focusKey: string | null;
  /** Keypad display of the focused line while typing. */
  liveDisplay: string;
  symbol: string;
  formatAmount: (minor: number) => string;
  shakeTrigger: number;
  onFocusLine: (key: string) => void;
  onPickCategory: (key: string) => void;
  onRemoveLine: (key: string) => void;
  onAddLine: () => void;
  onRemoveSplit: () => void;
};

function SplitList({
  lines,
  total,
  categories,
  focusKey,
  liveDisplay,
  symbol,
  formatAmount,
  shakeTrigger,
  onFocusLine,
  onPickCategory,
  onRemoveLine,
  onAddLine,
  onRemoveSplit,
}: SplitListProps) {
  const { colors } = useTokens();
  const remaining = splitRemaining(total, lines);
  return (
    <ShakeView trigger={shakeTrigger}>
      <View>
        {lines.map((line, index) => {
          const category = categories.find((c) => c.id === line.categoryId);
          const focused = focusKey === line.key;
          return (
            <Animated.View
              key={line.key}
              entering={FadeIn.duration(durations.chip)}
              exiting={FadeOut.duration(durations.press)}
              layout={LinearTransition.springify().damping(springs.layout.damping).stiffness(springs.layout.stiffness)}
            >
              {index > 0 ? <Hairline /> : null}
              <View className="h-12 flex-row items-center gap-3 pl-4 pr-2">
                <View className="min-w-0 shrink">
                  {category ? (
                    <CategoryPill
                      name={category.name}
                      icon={category.icon}
                      color={category.color as CategoryColorKey}
                      selected
                      onPress={() => onPickCategory(line.key)}
                    />
                  ) : (
                    <FormChip
                      label="Category"
                      icon="square.grid.2x2"
                      onPress={() => onPickCategory(line.key)}
                      accessibilityLabel={`Choose category for line ${index + 1}`}
                    />
                  )}
                </View>
                <Pressable
                  role="button"
                  accessibilityLabel={`Line ${index + 1} amount, ${formatAmount(line.amount)}`}
                  scale={1}
                  onPress={() => onFocusLine(line.key)}
                  className="h-9 min-w-0 flex-1 items-end justify-center rounded-[10px] px-2"
                  style={focused ? { backgroundColor: colors.accentSoft } : undefined}
                >
                  <Text
                    variant="body"
                    numeric
                    numberOfLines={1}
                    tone={focused ? 'accent' : line.amount > 0 ? 'default' : 'tertiary'}
                    className="font-medium"
                  >
                    {focused ? `${symbol}${liveDisplay}` : line.amount > 0 ? formatAmount(line.amount) : `${symbol}0`}
                  </Text>
                </Pressable>
                <Pressable
                  role="button"
                  accessibilityLabel={`Remove line ${index + 1}`}
                  haptic="light"
                  hitSlop={6}
                  onPress={() => onRemoveLine(line.key)}
                  className="h-9 w-9 items-center justify-center"
                >
                  <SymbolIcon name="minus.circle" size={20} color={colors.textTertiary} weight="regular" />
                </Pressable>
              </View>
            </Animated.View>
          );
        })}
        <Hairline />
        <View className="h-11 flex-row items-center pl-1 pr-4">
          {lines.length < MAX_SPLIT_LINES ? (
            <Button variant="plainText" size="sm" onPress={onAddLine}>
              <Text variant="callout">Add line</Text>
            </Button>
          ) : null}
          <Button variant="plainText" size="sm" onPress={onRemoveSplit}>
            <Text variant="callout">Remove split</Text>
          </Button>
          <View className="flex-1" />
          <Text
            variant="footnote"
            tone={remaining === 0 ? 'secondary' : 'warning'}
            numeric
            numberOfLines={1}
            accessibilityLabel={`Remaining ${formatAmount(Math.abs(remaining))}`}
          >
            {`Remaining ${remaining < 0 ? '−' : ''}${formatAmount(Math.abs(remaining))}`}
          </Text>
        </View>
      </View>
    </ShakeView>
  );
}

export { SplitList };
