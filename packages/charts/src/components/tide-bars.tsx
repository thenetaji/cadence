import {
  Canvas,
  Group,
  LinearGradient,
  RoundedRect,
  vec,
} from "@shopify/react-native-skia";
import * as React from "react";
import { View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  FadeIn,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";

import { barRects, slotIndex, tideBarCenter, type TideBar } from "../lib";
import { Text } from "@studio/ui";
import { withAlpha, useTokens } from "@studio/theme";
import {
  adjustableProps,
  FloatingLabel,
  useChartWidth,
  useScrubGesture,
  useSelectionTimeout,
} from "./chart-kit";
import { useChartFont } from "./use-chart-font";

export type TideBarsProps = {
  /** Oldest first, at most 12; the current month last. */
  bars: readonly TideBar[];
  /** Floating read-out for a month bar, e.g. "Sep · ₹52.3K". */
  formatLabel: (index: number) => string;
  accessibilityLabel: string;
  /** Bar area height; the month labels sit below it. */
  height?: number;
};

const GROW = 500;
const STAGGER = 40;
const RADIUS = 5;
/** Room above the bars for the floating read-out. */
const LANE = 28;
const DIM = 0.45;

type BarProps = {
  x: number;
  width: number;
  full: number;
  baseline: number;
  index: number;
  clock: SharedValue<number>;
  current: boolean;
  lit: boolean;
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
  lit,
  fill,
  accent,
}: BarProps) {
  const reduced = useReducedMotion();
  const op = useSharedValue(lit ? 1 : DIM);
  React.useEffect(() => {
    op.value = reduced ? (lit ? 1 : DIM) : withTiming(lit ? 1 : DIM, { duration: 200 });
  }, [lit, reduced, op]);
  const h = useDerivedValue(() => {
    const p = Math.min(Math.max((clock.value - index * STAGGER) / GROW, 0), 1);
    return full * (1 - Math.pow(1 - p, 5));
  });
  const y = useDerivedValue(() => baseline - h.value);
  if (full <= 0) return null;
  return (
    <Group opacity={op}>
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
    </Group>
  );
}

/** All-time view of the Home hero: one bar per month, the current one in brass. */
function TideBars({
  bars,
  formatLabel,
  accessibilityLabel,
  height = 88,
}: TideBarsProps) {
  const { colors, isDark } = useTokens();
  const reduced = useReducedMotion();
  const [width, onLayout] = useChartWidth();
  const labelFont = useChartFont(12, "semibold");
  const [selected, setSelected] = React.useState<number | null>(null);
  useSelectionTimeout(selected, setSelected);
  const count = bars.length;
  const shown = selected !== null && selected < count ? selected : null;
  const gesture = useScrubGesture({
    indexAt: (x) => (width <= 0 ? -1 : slotIndex(x, 0, width, count)),
    selected,
    onSelect: setSelected,
    minY: LANE - 6,
  });
  const lastX = React.useRef(0);
  if (shown !== null) lastX.current = tideBarCenter(shown, width, count);
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
      accessibilityLabel={accessibilityLabel}
      {...adjustableProps(
        count,
        shown,
        setSelected,
        shown !== null ? formatLabel(shown) : "",
      )}
    >
      {width > 0 ? (
        <Animated.View entering={reduced ? FadeIn.duration(150) : undefined}>
          <GestureDetector gesture={gesture}>
            <View collapsable={false}>
          <Canvas style={{ width, height: LANE + height }}>
            <Group>
              {rects.map((r, i) => (
                <Bar
                  key={bars[i]!.label + i}
                  x={r.x}
                  width={r.width}
                  full={r.height}
                  baseline={LANE + height}
                  index={i}
                  clock={clock}
                  current={bars[i]!.current}
                  lit={shown === null || shown === i}
                  fill={past}
                  accent={colors.accent}
                />
              ))}
            </Group>
            <RoundedRect
              x={0}
              y={LANE + height - 1}
              width={width}
              height={1}
              r={0}
              color={colors.separator}
            />
            {labelFont ? (
              <FloatingLabel
                text={shown !== null ? formatLabel(shown) : ""}
                font={labelFont}
                centerX={lastX.current}
                y={0}
                totalWidth={width}
              />
            ) : null}
          </Canvas>
            </View>
          </GestureDetector>
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
