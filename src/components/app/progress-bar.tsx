import * as React from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { durations } from '@/theme/tokens';
import { useTokens } from '@/theme/use-tokens';

type ProgressBarProps = {
  value: number;
  color?: string;
  accessibilityLabel?: string;
};

function ProgressBar({ value, color, accessibilityLabel }: ProgressBarProps) {
  const { colors } = useTokens();
  const ratio = Math.max(0, value);
  const fill = ratio > 1 ? colors.expense : ratio >= 0.9 ? colors.warning : (color ?? colors.accent);
  const width = useSharedValue(0);
  React.useEffect(() => {
    width.value = withTiming(Math.min(ratio, 1), { duration: durations.progress });
  }, [ratio, width]);
  const style = useAnimatedStyle(() => ({ width: `${width.value * 100}%` }));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(Math.min(ratio, 1) * 100) }}
      className="h-[6px] overflow-hidden rounded-full bg-fill"
    >
      <Animated.View className="h-full rounded-full" style={[{ backgroundColor: fill }, style]} />
    </View>
  );
}

export { ProgressBar };
export type { ProgressBarProps };
