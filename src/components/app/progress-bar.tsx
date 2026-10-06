import * as React from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { durations } from '@/theme/tokens';
import { useTokens } from '@/theme/use-tokens';

type ProgressBarProps = {
  value: number;
  color?: string;
  /** Pace tick, 0-1: today's position in the period. A 1 pt `text-tertiary` line across the track. */
  marker?: number;
  accessibilityLabel?: string;
};

function ProgressBar({ value, color, marker, accessibilityLabel }: ProgressBarProps) {
  const { colors } = useTokens();
  const ratio = Math.max(0, value);
  const fill = ratio > 1 ? colors.expense : ratio >= 0.9 ? colors.warning : (color ?? colors.accent);
  const width = useSharedValue(0);
  React.useEffect(() => {
    width.value = withTiming(Math.min(ratio, 1), { duration: durations.progress });
  }, [ratio, width]);
  const style = useAnimatedStyle(() => ({ width: `${width.value * 100}%` }));
  return (
    <View>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{ min: 0, max: 100, now: Math.round(Math.min(ratio, 1) * 100) }}
        className="h-[6px] overflow-hidden rounded-full bg-fill"
      >
        <Animated.View className="h-full rounded-full" style={[{ backgroundColor: fill }, style]} />
      </View>
      {marker !== undefined && marker > 0 && marker < 1 ? (
        <View
          pointerEvents="none"
          className="absolute"
          style={{ left: `${marker * 100}%`, top: -2, height: 10, width: 1, marginLeft: -0.5, backgroundColor: colors.textTertiary }}
        />
      ) : null}
    </View>
  );
}

export { ProgressBar };
export type { ProgressBarProps };
