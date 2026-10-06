import {
  Canvas,
  Group,
  LinearGradient,
  RoundedRect,
  vec,
} from "@shopify/react-native-skia";
import * as React from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

import { barRects, type TideBar } from "../lib";
import { Text } from "@studio/ui";
import { withAlpha, useTokens } from "@studio/theme";
import { useChartWidth } from "./chart-kit";

export type TideBarsProps = {
  /** Oldest first, at most 12; the current month last. */
  bars: readonly TideBar[];
  accessibilityLabel: string;
  /** Bar area height; the month labels sit below it. */
  height?: number;
};

const GROW = 500;
const STAGGER = 40;
const RADIUS = 5;

type BarProps = {
  x: number;
  width: number;
  full: number;
  baseline: number;
  index: number;
  clock: SharedValue<number>;
  current: boolean;
  fill: string;
  accent: string;
};

function Bar({
  x,
  width,
  full,
  baseline,
  index,
  clock,
  current,
  fill,
  accent,
}: BarProps) {
  const h = useDerivedValue(() => {
    const p = Math.min(Math.max((clock.value - index * STAGGER) / GROW, 0), 1);
    return full * (1 - Math.pow(1 - p, 5));
  });
  const y = useDerivedValue(() => baseline - h.value);
  if (full <= 0) return null;
  return (
    <RoundedRect
      x={x}
      y={y}
      width={width}
      height={h}
      r={RADIUS}
      color={current ? undefined : fill}
    >
      {current ? (
        <LinearGradient
          start={vec(0, baseline - full)}
          end={vec(0, baseline)}
          colors={[accent, withAlpha(accent, 0.45)]}
        />
      ) : null}
    </RoundedRect>
  );
}

/** All-time view of the Home hero: one bar per month, the current one in brass. */
function TideBars({ bars, accessibilityLabel, height = 88 }: TideBarsProps) {
  const { colors, isDark } = useTokens();
  const reduced = useReducedMotion();
  const [width, onLayout] = useChartWidth();
  const clock = useSharedValue(reduced ? GROW + STAGGER * 12 : 0);
  React.useEffect(() => {
    if (!reduced)
      clock.value = withTiming(GROW + STAGGER * Math.max(bars.length, 1), {
        duration: GROW + STAGGER * bars.length,
        easing: Easing.linear,
      });
  }, [reduced, clock, bars.length]);

  const rects = React.useMemo(
    () =>
      barRects(
        bars.map((b) => b.amount),
        width,
        height,
      ),
    [bars, width, height],
  );
  const past = isDark ? "rgba(255,255,255,0.22)" : "rgba(22,19,16,0.22)";
  const compact = width / Math.max(bars.length, 1) < 36;

  return (
    <View
      onLayout={onLayout}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      {width > 0 ? (
        <Animated.View entering={reduced ? FadeIn.duration(150) : undefined}>
          <Canvas style={{ width, height }}>
            <Group>
              {rects.map((r, i) => (
                <Bar
                  key={bars[i]!.label + i}
                  x={r.x}
                  width={r.width}
                  full={r.height}
                  baseline={height}
                  index={i}
                  clock={clock}
                  current={bars[i]!.current}
                  fill={past}
                  accent={colors.accent}
                />
              ))}
            </Group>
            <RoundedRect
              x={0}
              y={height - 1}
              width={width}
              height={1}
              r={0}
              color={colors.separator}
            />
          </Canvas>
          <View
            className="mt-2 flex-row"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {bars.map((b, i) => (
              <View key={b.label + i} className="flex-1 items-center">
                <Text
                  style={{ fontSize: 11, lineHeight: 14 }}
                  tone={b.current ? "secondary" : "tertiary"}
                >
                  {compact ? b.label.slice(0, 1) : b.label}
                </Text>
              </View>
            ))}
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

export { TideBars };
