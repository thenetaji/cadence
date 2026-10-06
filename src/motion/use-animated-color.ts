import * as React from 'react';
import { interpolateColor, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { motion } from './tokens';

/** Animated text colour that crossfades between two colours when `active` flips (e.g. Remaining -> warning). */
export function useAnimatedTextColor(from: string, to: string, active: boolean) {
  const reduced = useReducedMotion();
  const t = useSharedValue(active ? 1 : 0);
  React.useEffect(() => {
    t.value = reduced ? (active ? 1 : 0) : withTiming(active ? 1 : 0, { duration: motion.durations.chip });
  }, [active, reduced, t]);
  return useAnimatedStyle(() => ({ color: interpolateColor(t.value, [0, 1], [from, to]) }));
}
