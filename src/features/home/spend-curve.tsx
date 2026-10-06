import { BlurMask, Canvas, Circle, Group, LinearGradient, Path, RadialGradient, Skia, vec } from '@shopify/react-native-skia';
import * as React from 'react';
import { View } from 'react-native';
import { Easing, useDerivedValue, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { useChartWidth } from '@/components/charts/chart-kit';
import { buildPolyPath, pointAt } from '@/motion/path-point';
import { motion } from '@/motion/tokens';
import { withAlpha } from '@/theme/tokens';
import { useTokens } from '@/theme/use-tokens';

import { curveGeometry, monotoneSegments, type CurveInput, type Pt } from './curve';

export type SpendCurveProps = {
  series: readonly CurveInput[];
  height?: number;
  accessibilityLabel: string;
};

const BLEED_TOP = 16;
const BLEED_BOTTOM = 4;
const easeOutQuint = Easing.bezier(0.22, 1, 0.36, 1);

function linePath(pts: readonly Pt[]) {
  const b = Skia.PathBuilder.Make();
  if (pts.length < 2) return b.build();
  b.moveTo(pts[0]![0], pts[0]![1]);
  for (const [c1x, c1y, c2x, c2y, x, y] of monotoneSegments(pts)) b.cubicTo(c1x, c1y, c2x, c2y, x, y);
  return b.build();
}

function areaPath(pts: readonly Pt[], baseline: number) {
  const b = Skia.PathBuilder.Make();
  if (pts.length < 2) return b.build();
  b.moveTo(pts[0]![0], pts[0]![1]);
  for (const [c1x, c1y, c2x, c2y, x, y] of monotoneSegments(pts)) b.cubicTo(c1x, c1y, c2x, c2y, x, y);
  b.lineTo(pts[pts.length - 1]![0], baseline);
  b.lineTo(pts[0]![0], baseline);
  b.close();
  return b.build();
}

/**
 * Clean area curve: accent line over a soft fill, last month as a ghost line, a glowing end-dot. No grid, no axis
 * numbers; the two date labels live in the parent. Draws in on first mount.
 */
function SpendCurve({ series, height = 128, accessibilityLabel }: SpendCurveProps) {
  const { colors } = useTokens();
  const [width, onLayout] = useChartWidth();
  const reduced = useReducedMotion();
  const grow = useSharedValue(reduced ? 1 : 0);
  React.useEffect(() => {
    if (!reduced) grow.value = withDelay(120, withTiming(1, { duration: motion.durations.draw, easing: easeOutQuint }));
  }, [grow, reduced]);

  const geo = React.useMemo(() => curveGeometry(series, width, height), [series, width, height]);
  const paths = React.useMemo(
    () => ({ line: linePath(geo.line), ghost: linePath(geo.ghost), area: areaPath(geo.line, height + BLEED_BOTTOM) }),
    [geo, height],
  );
  const areaOpacity = useDerivedValue(() => Math.min(Math.max((grow.value - 0.3) / 0.7, 0), 1));
  const dotOpacity = useDerivedValue(() => Math.min(Math.max((grow.value - 0.8) / 0.2, 0), 1));
  const accent = colors.accent;

  // Comet rides the line while it draws, then the end-dot pulses once.
  const poly = React.useMemo(() => buildPolyPath(geo.line.map(([x, y]) => ({ x, y }))), [geo]);
  const cometX = useDerivedValue(() => pointAt(poly, grow.value).x);
  const cometY = useDerivedValue(() => pointAt(poly, grow.value).y);
  const tailX = useDerivedValue(() => pointAt(poly, grow.value - 0.04).x);
  const tailY = useDerivedValue(() => pointAt(poly, grow.value - 0.04).y);
  const cometOpacity = useDerivedValue(() => (grow.value >= 1 ? 0 : Math.min(1, (1 - grow.value) * 10)));
  const pulse = useSharedValue(0);
  React.useEffect(() => {
    if (!reduced) pulse.value = withDelay(120 + motion.durations.draw, withTiming(1, { duration: motion.durations.pulse * 1.4 }));
  }, [reduced, pulse]);
  const ringR = useDerivedValue(() => 6 + pulse.value * 12);
  const ringOpacity = useDerivedValue(() => (pulse.value <= 0 || pulse.value >= 1 ? 0 : (1 - pulse.value) * 0.55));

  return (
    <View onLayout={onLayout} style={{ height }} accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel} pointerEvents="none">
      {width > 0 && geo.end ? (
        <Canvas style={{ position: 'absolute', left: 0, top: -BLEED_TOP, width, height: height + BLEED_TOP + BLEED_BOTTOM }}>
          <Group transform={[{ translateY: BLEED_TOP }]}>
            <Path path={paths.ghost} style="stroke" strokeWidth={1.25} color={withAlpha(colors.text, 0.2)} strokeCap="round" strokeJoin="round" />
            <Group opacity={areaOpacity}>
              <Path path={paths.area} style="fill">
                <LinearGradient
                  start={vec(0, geo.end[1])}
                  end={vec(0, height)}
                  colors={[withAlpha(accent, 0.22), withAlpha(accent, 0.03), withAlpha(accent, 0)]}
                  positions={[0, 0.75, 1]}
                />
              </Path>
            </Group>
            <Path path={paths.line} style="stroke" strokeWidth={2.25} color={accent} strokeCap="round" strokeJoin="round" start={0} end={grow} />
            {reduced ? null : (
              <>
                <Circle cx={tailX} cy={tailY} r={4} color={accent} opacity={cometOpacity}>
                  <BlurMask blur={5} style="normal" />
                </Circle>
                <Circle cx={cometX} cy={cometY} r={7} color={accent} opacity={cometOpacity}>
                  <BlurMask blur={7} style="normal" />
                </Circle>
                <Circle cx={cometX} cy={cometY} r={2.5} color="#FFFFFF" opacity={cometOpacity} />
                <Circle cx={geo.end[0]} cy={geo.end[1]} r={ringR} color={accent} opacity={ringOpacity} />
              </>
            )}
            <Group opacity={dotOpacity}>
              <Circle cx={geo.end[0]} cy={geo.end[1]} r={18}>
                <RadialGradient
                  c={vec(geo.end[0], geo.end[1])}
                  r={18}
                  colors={[withAlpha(accent, 0.6), withAlpha(accent, 0.18), withAlpha(accent, 0)]}
                  positions={[0, 0.45, 1]}
                />
              </Circle>
              <Circle cx={geo.end[0]} cy={geo.end[1]} r={5} color={accent} />
              <Circle cx={geo.end[0]} cy={geo.end[1]} r={5} style="stroke" strokeWidth={2.5} color={colors.bg} />
            </Group>
          </Group>
        </Canvas>
      ) : null}
    </View>
  );
}

export { SpendCurve };
