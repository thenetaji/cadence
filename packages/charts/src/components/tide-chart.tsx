import {
  BlurMask,
  Canvas,
  Circle,
  Group,
  LinearGradient,
  Path,
  RadialGradient,
  Skia,
  vec,
  type SkPathBuilder,
} from "@shopify/react-native-skia";
import * as React from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  useDerivedValue,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { poolSamples, TIDE, tideGeometry, tideRamp, tideWave } from "../lib";
import { withAlpha, useTokens } from "@studio/theme";
import { useChartWidth } from "./chart-kit";

export type TideChartProps = {
  /** Cumulative spend at the end of each day up to today, minor units. Today is the last entry. */
  cumulative: readonly number[];
  /** Days in the period; the frame is the whole period. */
  days: number;
  /** Biggest comparison figure (last period's total, the monthly budget): sets the water level. */
  reference: number;
  accessibilityLabel: string;
  height?: number;
  /** Stop the animation (screen unfocused, app backgrounded). It resumes at the same phase. */
  paused?: boolean;
};

const CREAM = "#FFF1D2";

type Frame = {
  flat: number[];
  joinX: number;
  levelY: number;
  baseline: number;
  width: number;
  xs: number[];
};

/** One outline of the water: shore (exact, never moves) then the pool surface. `body` closes down to the baseline. */
function trace(
  b: SkPathBuilder,
  f: Frame,
  t: number,
  rise: number,
  amp: number,
  lift: number,
  phase: number,
  scale: number,
  body: boolean,
) {
  "worklet";
  const sy = (y: number) => f.baseline - (f.baseline - y) * rise;
  b.moveTo(0, f.baseline);
  for (let i = 0; i < f.flat.length; i += 6) {
    b.cubicTo(
      f.flat[i]!,
      sy(f.flat[i + 1]!),
      f.flat[i + 2]!,
      sy(f.flat[i + 3]!),
      f.flat[i + 4]!,
      sy(f.flat[i + 5]!),
    );
  }
  for (let i = 0; i < f.xs.length; i++) {
    const x = f.xs[i]!;
    const up =
      (tideWave(x, t, phase, scale) * amp + lift) * tideRamp(x, f.joinX);
    b.lineTo(x, sy(f.levelY - up));
  }
  if (body) {
    b.lineTo(f.width, f.baseline);
    b.lineTo(0, f.baseline);
    b.close();
  }
}

/**
 * "Tide": the month so far as a shore, still water at today's level to the month end, two slow travelling waves, a
 * drifting caustic and a breath. One canvas; the loop runs on the UI thread and never re-renders React.
 */
function TideChart({
  cumulative,
  days,
  reference,
  accessibilityLabel,
  height = 120,
  paused = false,
}: TideChartProps) {
  const { colors, isDark } = useTokens();
  const reduced = useReducedMotion();
  const [width, onLayout] = useChartWidth();
  const accent = colors.accent;

  const geo = React.useMemo(
    () => tideGeometry(cumulative, days, reference, width, height),
    [cumulative, days, reference, width, height],
  );
  const frame = React.useMemo<Frame>(
    () => ({
      flat: geo.segments.flatMap((s) => [...s]),
      joinX: geo.joinX,
      levelY: geo.levelY,
      baseline: geo.baseline,
      width,
      xs: poolSamples(geo.joinX, width),
    }),
    [geo, width],
  );

  const clock = useSharedValue(0);
  const rise = useSharedValue(reduced ? 1 : 0);
  const waveFade = useSharedValue(0);
  const overshoot = useSharedValue(0);
  const loop = useFrameCallback((info) => {
    clock.value += (info.timeSincePreviousFrame ?? 0) / 1000;
  }, false);

  React.useEffect(() => {
    if (reduced) return;
    rise.value = withTiming(1, {
      duration: 900,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
    });
    waveFade.value = withDelay(500, withTiming(1, { duration: 400 }));
    overshoot.value = withDelay(
      650,
      withSequence(
        withTiming(3, { duration: 160 }),
        withSpring(0, { damping: 20, stiffness: 180 }),
      ),
    );
  }, [reduced, rise, waveFade, overshoot]);

  React.useEffect(() => {
    loop.setActive(!reduced && !paused && width > 0);
  }, [loop, reduced, paused, width]);

  const edge = useDerivedValue(() => {
    const b = Skia.PathBuilder.Make();
    trace(
      b,
      frame,
      clock.value,
      rise.value,
      waveFade.value,
      overshoot.value,
      0,
      1,
      false,
    );
    return b.build();
  });
  const body = useDerivedValue(() => {
    const b = Skia.PathBuilder.Make();
    trace(
      b,
      frame,
      clock.value,
      rise.value,
      waveFade.value,
      overshoot.value,
      0,
      1,
      true,
    );
    return b.build();
  });
  const back = useDerivedValue(() => {
    const b = Skia.PathBuilder.Make();
    trace(
      b,
      frame,
      clock.value,
      rise.value,
      waveFade.value * TIDE.back.amplitudeScale,
      overshoot.value + TIDE.back.lift,
      TIDE.back.phaseCycles,
      1,
      true,
    );
    return b.build();
  });

  const breath = useDerivedValue(() =>
    reduced
      ? 0.885
      : 0.885 +
        TIDE.breathDepth *
          1.9 *
          Math.sin((2 * Math.PI * clock.value) / TIDE.breathPeriod),
  );
  const poolWidth = Math.max(width - geo.joinX, 0);
  const causticTransform = useDerivedValue(() => {
    const drift = reduced
      ? 0
      : Math.sin((2 * Math.PI * clock.value) / TIDE.causticPeriod) *
        TIDE.causticDrift *
        poolWidth;
    const y = geo.baseline - (geo.baseline - geo.levelY) * rise.value;
    return [
      { translateX: geo.joinX + poolWidth / 2 + drift },
      { translateY: y },
      { scaleY: 0.5 },
    ];
  });
  const dotY = useDerivedValue(
    () => geo.baseline - (geo.baseline - geo.levelY) * rise.value,
  );

  const top = Math.max(geo.levelY - 6, 0);
  const bodyColors = isDark
    ? [
        withAlpha(accent, 0.52),
        withAlpha(accent, 0.26),
        withAlpha(accent, 0.1),
        withAlpha(accent, 0.03),
      ]
    : [
        withAlpha(accent, 0.47),
        withAlpha(accent, 0.23),
        withAlpha(accent, 0.09),
        withAlpha(accent, 0.03),
      ];
  const lineColors = [
    accent,
    accent,
    isDark ? withAlpha(CREAM, 0.9) : withAlpha(accent, 0.7),
  ];
  const causticColors = isDark
    ? [withAlpha(CREAM, 0.22), withAlpha(CREAM, 0)]
    : ["rgba(255,255,255,0.55)", "rgba(255,255,255,0)"];
  const joinFraction = width > 0 ? Math.min(geo.joinX / width, 1) : 1;

  return (
    <View
      onLayout={onLayout}
      style={{ height }}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      {width > 0 ? (
        <Animated.View entering={reduced ? FadeIn.duration(150) : undefined}>
          <Canvas style={{ width, height }}>
            <Path
              path={back}
              style="fill"
              color={withAlpha(accent, isDark ? 0.1 : 0.12)}
            />
            <Group opacity={breath}>
              <Path path={body} style="fill">
                <LinearGradient
                  start={vec(0, top)}
                  end={vec(0, height)}
                  colors={bodyColors}
                  positions={[0, 0.2, 0.6, 1]}
                />
              </Path>
            </Group>
            <Group clip={body}>
              <Group transform={causticTransform}>
                <Circle cx={0} cy={0} r={width * 0.34}>
                  <RadialGradient
                    c={vec(0, 0)}
                    r={width * 0.34}
                    colors={causticColors}
                  />
                </Circle>
              </Group>
            </Group>
            {reduced ? null : (
              <Path
                path={edge}
                style="stroke"
                strokeWidth={6}
                color={withAlpha(accent, 0.5)}
                strokeCap="round"
                strokeJoin="round"
              >
                <BlurMask blur={4} style="normal" />
              </Path>
            )}
            <Path
              path={edge}
              style="stroke"
              strokeWidth={1.75}
              strokeCap="round"
              strokeJoin="round"
            >
              <LinearGradient
                start={vec(0, 0)}
                end={vec(width, 0)}
                colors={lineColors}
                positions={[0, joinFraction, 1]}
              />
            </Path>
            <Circle cx={geo.joinX} cy={dotY} r={7} color={colors.bg} />
            <Circle cx={geo.joinX} cy={dotY} r={4.5} color={accent} />
          </Canvas>
        </Animated.View>
      ) : null}
    </View>
  );
}

export { TideChart };
