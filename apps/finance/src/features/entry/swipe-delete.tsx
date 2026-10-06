import * as React from 'react';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { Extrapolation, interpolate, runOnJS, useAnimatedReaction, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { AppIcon } from '@/icons/app-icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { haptic , useTokens } from '@studio/theme';

const ACTION_WIDTH = 72;
const FULL_SWIPE = 200;
const tick = () => haptic('selection');

function DeleteAction({ translation, onFull, label }: { translation: SharedValue<number>; onFull: () => void; label: string }) {
  const { colors } = useTokens();
  useAnimatedReaction(
    () => translation.value,
    (value, previous) => {
      if (value < -FULL_SWIPE && (previous ?? 0) >= -FULL_SWIPE) runOnJS(onFull)();
      // Light tick the moment the action is fully revealed.
      else if (value < -ACTION_WIDTH && (previous ?? 0) >= -ACTION_WIDTH) runOnJS(tick)();
    },
  );
  const iconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(-translation.value, [0, ACTION_WIDTH * 0.5], [0, 1], Extrapolation.CLAMP),
    transform: [{ scale: interpolate(-translation.value, [0, ACTION_WIDTH, FULL_SWIPE], [0.4, 1, 1.25], Extrapolation.CLAMP) }],
  }));
  const style = useAnimatedStyle(() => ({ width: Math.max(ACTION_WIDTH, -translation.value) }));
  return (
    <Pressable role="button" accessibilityLabel={label} scale={1} onPress={onFull} className="flex-row justify-end" style={{ width: ACTION_WIDTH }}>
      <Animated.View style={[{ backgroundColor: colors.expense, minWidth: ACTION_WIDTH }, style]} className="items-center justify-center gap-1">
        <Animated.View style={iconStyle}>
          <AppIcon name="trash.fill" size={18} color="#FFFFFF" />
        </Animated.View>
        <Text variant="caption" className="text-white">
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

type SwipeDeleteProps = { onDelete: () => void; label?: string; children: React.ReactNode };

/** Swipe left to reveal Delete; a full swipe deletes with a medium haptic. */
function SwipeDelete({ onDelete, label = 'Delete', children }: SwipeDeleteProps) {
  const ref = React.useRef<SwipeableMethods>(null);
  const full = React.useCallback(() => {
    haptic('medium');
    ref.current?.close();
    onDelete();
  }, [onDelete]);
  return (
    <ReanimatedSwipeable
      ref={ref}
      friction={1.6}
      rightThreshold={ACTION_WIDTH / 2}
      renderRightActions={(_progress, translation) => <DeleteAction translation={translation} onFull={full} label={label} />}
    >
      {children}
    </ReanimatedSwipeable>
  );
}

export { SwipeDelete };
