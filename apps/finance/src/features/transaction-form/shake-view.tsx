import * as React from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

const AMPLITUDE = 6;

/** Validation shake: 3 oscillations of 6 pt over 300 ms whenever `trigger` increases. */
function ShakeView({ trigger, children }: { trigger: number; children: React.ReactNode }) {
  const x = useSharedValue(0);
  React.useEffect(() => {
    if (trigger === 0) return;
    x.value = withRepeat(
      withSequence(withTiming(AMPLITUDE, { duration: 25 }), withTiming(-AMPLITUDE, { duration: 50 }), withTiming(0, { duration: 25 })),
      3,
    );
  }, [trigger, x]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

export { ShakeView };
