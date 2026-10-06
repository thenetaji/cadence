import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { runOnJS, useAnimatedReaction, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { Amount } from '@/components/app/amount';
import { IconTile } from '@/components/app/icon-tile';
import { SymbolIcon } from '@/components/app/symbol';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { haptic } from '@/theme/haptics';
import { pressScale, type CategoryColorKey } from '@/theme/tokens';
import { useTokens } from '@/theme/use-tokens';

type TransactionKind = 'expense' | 'income' | 'transfer';

type TransactionRowProps = {
  kind: TransactionKind;
  title: string;
  subtitle: string;
  amount: string;
  trailing?: string;
  icon: string;
  color: CategoryColorKey;
  split?: boolean;
  separator?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  /** Spoken label; defaults to the visible text joined with commas. */
  accessibilityLabel?: string;
  /** Replaces the default Delete action (revealed by swiping left). */
  rightAction?: SwipeAction;
  /** Replaces the default Duplicate action (revealed by swiping right). */
  leftAction?: SwipeAction;
};

type SwipeAction = { label: string; symbol: string; tone?: 'accent' | 'destructive' | 'neutral'; onTrigger: () => void };

const ACTION_WIDTH = 72;
const FULL_SWIPE = 200;

type DeleteActionProps = {
  translation: SharedValue<number>;
  onFull: () => void;
  label?: string;
  symbol?: string;
  tone?: NonNullable<SwipeAction['tone']>;
};

function DeleteAction({ translation, onFull, label = 'Delete', symbol = 'trash.fill', tone = 'destructive' }: DeleteActionProps) {
  const { colors } = useTokens();
  const background = tone === 'destructive' ? colors.expense : tone === 'accent' ? colors.accent : colors.textSecondary;
  useAnimatedReaction(
    () => translation.value,
    (value, previous) => {
      if (value < -FULL_SWIPE && (previous ?? 0) >= -FULL_SWIPE) runOnJS(onFull)();
    },
  );
  const style = useAnimatedStyle(() => ({ width: Math.max(ACTION_WIDTH, -translation.value) }));
  return (
    <Pressable role="button" accessibilityLabel={label} scale={1} onPress={onFull} className="flex-row justify-end" style={{ width: ACTION_WIDTH }}>
      <Animated.View style={[{ backgroundColor: background, minWidth: ACTION_WIDTH }, style]} className="items-center justify-center gap-1">
        <SymbolIcon name={symbol} size={18} color="#FFFFFF" />
        <Text variant="caption" className="text-white">
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

function DuplicateAction({ label = 'Duplicate', symbol = 'doc.on.doc', tone = 'accent' }: { label?: string; symbol?: string; tone?: NonNullable<SwipeAction['tone']> }) {
  const { colors } = useTokens();
  const background = tone === 'destructive' ? colors.expense : tone === 'neutral' ? colors.textSecondary : colors.accent;
  return (
    <View style={{ width: ACTION_WIDTH, backgroundColor: background }} className="items-center justify-center gap-1">
      <SymbolIcon name={symbol} size={18} color="#FFFFFF" />
      <Text variant="caption" className="text-white">
        {label}
      </Text>
    </View>
  );
}

function TransactionRow({
  kind,
  title,
  subtitle,
  amount,
  trailing,
  icon,
  color,
  split = false,
  separator = true,
  onPress,
  onLongPress,
  onDelete,
  onDuplicate,
  accessibilityLabel,
  rightAction,
  leftAction,
}: TransactionRowProps) {
  const { colors } = useTokens();
  const swipeRef = React.useRef<SwipeableMethods>(null);
  const tone = kind === 'income' ? 'income' : kind === 'transfer' ? 'secondary' : 'default';
  const label = accessibilityLabel ?? [title, subtitle, amount, trailing].filter(Boolean).join(', ');
  const triggerRight = rightAction?.onTrigger ?? onDelete;
  const triggerLeft = leftAction?.onTrigger ?? onDuplicate;

  const handleFullDelete = React.useCallback(() => {
    haptic('medium');
    swipeRef.current?.close();
    triggerRight?.();
  }, [triggerRight]);

  const actions = [
    ...(triggerRight ? [{ name: 'delete', label: rightAction?.label ?? 'Delete' }] : []),
    ...(triggerLeft ? [{ name: 'duplicate', label: leftAction?.label ?? 'Duplicate' }] : []),
    ...(onLongPress ? [{ name: 'longpress', label: 'More' }] : []),
  ];

  return (
    <ReanimatedSwipeable
      ref={swipeRef}
      friction={1.6}
      overshootLeft={false}
      rightThreshold={ACTION_WIDTH / 2}
      leftThreshold={ACTION_WIDTH / 2}
      renderRightActions={
        triggerRight
          ? (_progress, translation) => (
              <DeleteAction
                translation={translation}
                onFull={handleFullDelete}
                label={rightAction?.label}
                symbol={rightAction?.symbol}
                tone={rightAction?.tone}
              />
            )
          : undefined
      }
      renderLeftActions={triggerLeft ? () => <DuplicateAction label={leftAction?.label} symbol={leftAction?.symbol} tone={leftAction?.tone} /> : undefined}
      onSwipeableOpen={(direction) => {
        // `direction` is the swipe direction: swiping right opens the left (Duplicate) panel.
        if (direction === 'right') {
          swipeRef.current?.close();
          triggerLeft?.();
        }
      }}
    >
      <Pressable
        role="button"
        accessible
        accessibilityLabel={label}
        accessibilityActions={actions}
        onAccessibilityAction={(event) => {
          const name = event.nativeEvent.actionName;
          if (name === 'delete') triggerRight?.();
          else if (name === 'duplicate') triggerLeft?.();
          else if (name === 'longpress') onLongPress?.();
        }}
        onPress={onPress}
        onLongPress={onLongPress}
        scale={pressScale.row}
        className="min-h-[52px] flex-row items-center bg-surface px-4 py-2"
      >
        <IconTile icon={icon} color={color} splitBadge={split} />
        <View className="ml-3 mr-3 flex-1">
          <Text variant="body" numberOfLines={1} ellipsizeMode="tail">
            {title}
          </Text>
          <Text variant="subhead" tone="secondary" numberOfLines={1} ellipsizeMode="tail">
            {subtitle}
          </Text>
        </View>
        <View className="items-end">
          <Amount value={amount} tone={tone} variant="row" />
          {trailing ? (
            <Text variant="footnote" tone="tertiary" numeric numberOfLines={1}>
              {trailing}
            </Text>
          ) : null}
        </View>
        {separator ? (
          <View
            pointerEvents="none"
            style={{ left: 64, height: StyleSheet.hairlineWidth, backgroundColor: colors.separator }}
            className="absolute bottom-0 right-0"
          />
        ) : null}
      </Pressable>
    </ReanimatedSwipeable>
  );
}

export { TransactionRow };
export type { SwipeAction, TransactionKind, TransactionRowProps };
