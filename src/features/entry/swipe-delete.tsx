import * as React from 'react';
import { View } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { runOnJS, useAnimatedReaction, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { SymbolIcon } from '@/components/app/symbol';
import { Text } from '@/components/ui/text';
import { haptic } from '@/theme/haptics';
import { useTokens } from '@/theme/use-tokens';

const ACTION_WIDTH = 72;
const FULL_SWIPE = 200;

function DeleteAction({ translation, onFull, label }: { translation: SharedValue<number>; onFull: () => void; label: string }) {
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
          {label}
        </Text>
      </Animated.View>
    </View>
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
      overshootRight={false}
      rightThreshold={ACTION_WIDTH / 2}
      renderRightActions={(_progress, translation) => <DeleteAction translation={translation} onFull={full} label={label} />}
    >
      {children}
    </ReanimatedSwipeable>
  );
}

export { SwipeDelete };
