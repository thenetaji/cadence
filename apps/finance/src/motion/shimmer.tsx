import * as React from 'react';
import { StyleSheet, type LayoutChangeEvent } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { useTokens , withAlpha } from '@studio/theme';

import { motion } from './tokens';

type ShimmerProps = {
  /** Sweep once when this becomes true (and on mount if already true). */
  active: boolean;
  /** Defaults to the brass accent. */
  color?: string;
  delay?: number;
};

/**
 * One-time highlight sweep across the parent (a newly inserted row). Fill-absolute, ignores
 * touches, clips to the parent's bounds only if the parent has `overflow: hidden`.
 */
function Shimmer({ active, color, delay = 220 }: ShimmerProps) {
  const { colors } = useTokens();
  const reduced = useReducedMotion();
  const width = useSharedValue(0);
  const progress = useSharedValue(0);
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    if (!active || reduced) return;
    progress.value = 0;
    opacity.value = withDelay(delay, withTiming(1, { duration: 80 }));
    progress.value = withDelay(delay, withTiming(1, { duration: motion.durations.shimmer, easing: Easing.inOut(Easing.quad) }, () => {
      opacity.value = withTiming(0, { duration: 120 });
    }));
  }, [active, reduced, delay, progress, opacity]);

  const onLayout = React.useCallback((e: LayoutChangeEvent) => {
    width.set(e.nativeEvent.layout.width);
  }, [width]);

  const band = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: -80 + progress.value * (width.value + 160) }, { skewX: '-18deg' }],
  }));

  const tint = color ?? colors.accent;
  return (
    <Animated.View pointerEvents="none" onLayout={onLayout} style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
      <Animated.View style={[{ position: 'absolute', top: 0, bottom: 0, width: 64, backgroundColor: withAlpha(tint, 0.22) }, band]} />
    </Animated.View>
  );
}

export { Shimmer };
export type { ShimmerProps };
