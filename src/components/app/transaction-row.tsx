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
};

const ACTION_WIDTH = 72;
const FULL_SWIPE = 200;

type DeleteActionProps = {
  translation: SharedValue<number>;
  onFull: () => void;
};

function DeleteAction({ translation, onFull }: DeleteActionProps) {
  const { colors } = useTokens();
  useAnimatedReaction(
    () => translation.value,
    (value, previous) => {
      if (value < -FULL_SWIPE && (previous ?? 0) >= -FULL_SWIPE) runOnJS(onFull)();
    },
  );
  const style = useAnimatedStyle(() => ({ width: Math.max(ACTION_WIDTH, -translation.value) }));
  return (
    <View className="flex-row justify-end" style={{ width: ACTION_WIDTH }}>
      <Animated.View style={[{ backgroundColor: colors.expense, minWidth: ACTION_WIDTH }, style]} className="items-center justify-center gap-1">
        <SymbolIcon name="trash.fill" size={18} color="#FFFFFF" />
        <Text variant="caption" className="text-white">
          Delete
        </Text>
      </Animated.View>
    </View>
  );
}

function DuplicateAction() {
  const { colors } = useTokens();
  return (
    <View style={{ width: ACTION_WIDTH, backgroundColor: colors.accent }} className="items-center justify-center gap-1">
      <SymbolIcon name="doc.on.doc" size={18} color="#FFFFFF" />
      <Text variant="caption" className="text-white">
        Duplicate
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
}: TransactionRowProps) {
  const { colors } = useTokens();
  const swipeRef = React.useRef<SwipeableMethods>(null);
  const tone = kind === 'income' ? 'income' : kind === 'transfer' ? 'secondary' : 'default';
  const label = [title, subtitle, amount, trailing].filter(Boolean).join(', ');

  const handleFullDelete = React.useCallback(() => {
    haptic('medium');
    swipeRef.current?.close();
    onDelete?.();
  }, [onDelete]);

  const actions = [
    ...(onDelete ? [{ name: 'delete', label: 'Delete' }] : []),
    ...(onDuplicate ? [{ name: 'duplicate', label: 'Duplicate' }] : []),
    ...(onLongPress ? [{ name: 'longpress', label: 'More' }] : []),
  ];

  return (
    <ReanimatedSwipeable
      ref={swipeRef}
      friction={1.6}
      overshootLeft={false}
      overshootRight={false}
      rightThreshold={ACTION_WIDTH / 2}
      leftThreshold={ACTION_WIDTH / 2}
      renderRightActions={onDelete ? (_progress, translation) => <DeleteAction translation={translation} onFull={handleFullDelete} /> : undefined}
      renderLeftActions={
        onDuplicate
          ? () => <DuplicateAction />
          : undefined
      }
      onSwipeableOpen={(direction) => {
        if (direction === 'left') {
          swipeRef.current?.close();
          onDuplicate?.();
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
          if (name === 'delete') onDelete?.();
          else if (name === 'duplicate') onDuplicate?.();
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
export type { TransactionKind, TransactionRowProps };
