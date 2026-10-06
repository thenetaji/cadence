import * as React from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';

import { motion } from '@studio/motion';
import { useTokens } from '@studio/theme';

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
  const reduced = useReducedMotion();
  const width = useSharedValue(reduced ? Math.min(ratio, 1) : 0);
  const pace = useSharedValue(reduced ? (marker ?? 0) : 0);
  React.useEffect(() => {
    const next = Math.min(ratio, 1);
    width.value = reduced ? next : withSpring(next, motion.springs.fill);
  }, [ratio, width, reduced]);
  React.useEffect(() => {
    const next = marker ?? 0;
    pace.value = reduced ? next : withDelay(180, withSpring(next, motion.springs.fill));
  }, [marker, pace, reduced]);
  const style = useAnimatedStyle(() => ({ width: `${Math.max(0, width.value) * 100}%` }));
  const markerStyle = useAnimatedStyle(() => ({ left: `${pace.value * 100}%` }));
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
        <Animated.View
          pointerEvents="none"
          className="absolute"
          style={[{ top: -2, height: 10, width: 1, marginLeft: -0.5, backgroundColor: colors.textTertiary }, markerStyle]}
        />
      ) : null}
    </View>
  );
}

export { ProgressBar };
export type { ProgressBarProps };
