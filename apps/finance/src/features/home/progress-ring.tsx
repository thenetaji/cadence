import * as React from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const easeOutQuint = Easing.bezier(0.22, 1, 0.36, 1);

type ProgressRingProps = {
  size?: number;
  stroke?: number;
  value: number;
  color: string;
  track: string;
  delay?: number;
};

/** Round-capped ring that sweeps from 0 to `value` (0-1) on first mount. */
function ProgressRing({
  size = 36,
  stroke = 3.5,
  value,
  color,
  track,
  delay = 400,
}: ProgressRingProps) {
  const reduced = useReducedMotion();
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const target = Math.min(Math.max(value, 0), 1);
  const progress = useSharedValue(reduced ? target : 0);
  React.useEffect(() => {
    progress.value = reduced
      ? target
      : withDelay(
          delay,
          withTiming(target, { duration: 600, easing: easeOutQuint }),
        );
  }, [progress, target, reduced, delay]);
  const props = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));
  return (
    <View
      style={{ width: size, height: size }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: [{ rotate: "-90deg" }] }}
      >
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={track}
          strokeWidth={stroke}
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={props}
        />
      </Svg>
    </View>
  );
}

export { ProgressRing };
