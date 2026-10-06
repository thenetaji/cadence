import { useIsFocused } from 'expo-router';
import * as React from 'react';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import type { StyleProp, ViewStyle } from 'react-native';

import { motion } from './tokens';

type FocusFxProps = { children?: React.ReactNode; style?: StyleProp<ViewStyle>; className?: string };

/**
 * Tab-switch polish for screens that native tabs keep mounted: each time the screen regains
 * focus its content crossfades up from 0.6 opacity and a 8 pt offset. The first focus is left
 * to the screen's own entrance choreography.
 */
function FocusFx({ children, style, className }: FocusFxProps) {
  const focused = useIsFocused();
  const reduced = useReducedMotion();
  const seen = React.useRef(false);
  const t = useSharedValue(1);
  React.useEffect(() => {
    if (!focused) return;
    if (!seen.current) {
      seen.current = true;
      return;
    }
    if (reduced) return;
    t.value = 0;
    t.value = withTiming(1, { duration: motion.durations.fade, easing: Easing.out(Easing.cubic) });
  }, [focused, reduced, t]);
  const animated = useAnimatedStyle(() => ({ opacity: 0.6 + 0.4 * t.value, transform: [{ translateY: (1 - t.value) * 8 }] }));
  return (
    <Animated.View style={[style, animated]} className={className}>
      {children}
    </Animated.View>
  );
}

export { FocusFx };
