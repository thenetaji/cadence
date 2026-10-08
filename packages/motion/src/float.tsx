import * as React from "react";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import type { StyleProp, ViewStyle } from "react-native";

import { motion } from "./tokens";

type FloatProps = {
  children?: React.ReactNode;
  amplitude?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
};

/** Slow vertical drift (3 s loop, ±3 pt) for empty-state icons. Still under Reduce Motion. */
function Float({
  children,
  amplitude = 3,
  duration = motion.durations.float,
  style,
}: FloatProps) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  React.useEffect(() => {
    if (reduced) return;
    t.value = withRepeat(
      withTiming(1, {
        duration: duration / 2,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true,
    );
  }, [reduced, duration, t]);
  const animated = useAnimatedStyle(() => ({
    transform: [{ translateY: (t.value * 2 - 1) * amplitude }],
  }));
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

export { Float };
