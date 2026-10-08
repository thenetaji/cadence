import * as React from "react";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
} from "react-native-reanimated";
import type { StyleProp, ViewStyle } from "react-native";

import { motion } from "./tokens";

/** Selection bounce: scale 1 -> 1.08 -> 1. Returns a shared value to multiply into a transform. */
export function usePopValue(active: boolean, scale: number = motion.popScale) {
  const reduced = useReducedMotion();
  const value = useSharedValue(1);
  const first = React.useRef(true);
  React.useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (active && !reduced) {
      value.value = withSequence(
        withSpring(scale, motion.springs.pop),
        withSpring(1, motion.springs.sheetChip),
      );
    }
  }, [active, reduced, scale, value]);
  return value;
}

type PopProps = {
  active: boolean;
  scale?: number;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Wrapper form of the bounce, for things that are not Pressables (a swatch ring, a badge). */
function Pop({ active, scale, children, style }: PopProps) {
  const value = usePopValue(active, scale);
  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: value.value }],
  }));
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

export { Pop };
