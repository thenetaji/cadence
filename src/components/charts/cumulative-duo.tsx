import { BlurMask, Canvas, Circle, Group, Line, LinearGradient, Path, RadialGradient, Skia, vec } from '@shopify/react-native-skia';
import * as React from 'react';
import { View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { Easing, useDerivedValue, useReducedMotion, useSharedValue, withDelay, withTiming, type SharedValue } from 'react-native-reanimated';

import { duoGeometry, gapSegments, sampleSmooth, type DuoPoint, type Pt } from '@/lib/charts';
import { monotoneSegments } from '@/lib/charts/smooth';
import { buildPolyPath, pointAt } from '@/motion/path-point';
import { withAlpha } from '@/theme/tokens';
import { useTokens } from '@/theme/use-tokens';
import { adjustableProps, FloatingLabel, useChartWidth, useScrubGesture } from './chart-kit';
import { useChartFont } from './use-chart-font';

export type CumulativeDuoProps = {
  /** One entry per day of the period; cumulative values in minor units, null after today. */
  series: readonly DuoPoint[];
  /** Plot height, pt. The chart adds a label lane above. */
  height?: number;
  /** Floating read-out for a day, e.g. "12 Oct · In ₹1.45L · Out ₹21.3K". */
  formatLabel: (index: number) => string;
  accessibilityLabel: string;
};

const LANE = 28;
const INSET = 8;
const easeOutQuint = Easing.bezier(0.22, 1, 0.36, 1);
const OUT_DELAY = 100;
const OUT_MS = 650;
const IN_DELAY = 650;
const IN_MS = 500;
const FILL_DELAY = 1100;

function polyline(pts: readonly Pt[]) {
  const b = Skia.PathBuilder.Make();
  if (pts.length < 2) return b.build();
  b.moveTo(pts[0]![0], pts[0]![1]);
  for (let i = 1; i < pts.length; i++) b.lineTo(pts[i]![0], pts[i]![1]);
  return b.build();
}

function smoothPath(pts: readonly Pt[], closeTo?: number) {
  const b = Skia.PathBuilder.Make();
  if (pts.length < 2) return b.build();
  b.moveTo(pts[0]![0], pts[0]![1]);
  for (const [c1x, c1y, c2x, c2y, x, y] of monotoneSegments(pts)) b.cubicTo(c1x, c1y, c2x, c2y, x, y);
  if (closeTo !== undefined) {
    b.lineTo(pts[pts.length - 1]![0], closeTo);
    b.lineTo(pts[0]![0], closeTo);
    b.close();
  }
  return b.build();
}

function EndDot({ at, color, bg, opacity }: { at: Pt; color: string; bg: string; opacity: SharedValue<number> }) {
  return (
    <Group opacity={opacity}>
      <Circle cx={at[0]} cy={at[1]} r={18}>
        <RadialGradient c={vec(at[0], at[1])} r={18} colors={[withAlpha(color, 0.6), withAlpha(color, 0.18), withAlpha(color, 0)]} positions={[0, 0.45, 1]} />
      </Circle>
      <Circle cx={at[0]} cy={at[1]} r={5} color={color} />
      <Circle cx={at[0]} cy={at[1]} r={5} style="stroke" strokeWidth={2.5} color={bg} />
    </Group>
  );
}

/**
 * Two cumulative lines on ONE shared axis: money in (mint, stepped) and money out (brass, smooth). The gap between
 * them is tinted mint where in leads (kept) and warm red where out leads. Draws in out first, then in; scrubbable.
 */
function CumulativeDuo({ series, height = 150, formatLabel, accessibilityLabel }: CumulativeDuoProps) {
  const { colors } = useTokens();
  const [width, onLayout] = useChartWidth();
  const labelFont = useChartFont(12, 'semibold');
  const reduced = useReducedMotion();
  const [selected, setSelected] = React.useState<number | null>(null);

  const plotWidth = Math.max(0, width - INSET);
  const geo = React.useMemo(() => duoGeometry(series, plotWidth, height), [series, plotWidth, height]);
  const todayIndex = React.useMemo(() => series.reduce((last, d, i) => (d.out !== null ? i : last), -1), [series]);
  const dense = React.useMemo(() => sampleSmooth(geo.outLine), [geo]);
  const shapes = React.useMemo(() => {
    const baseline = height - 4;
    return {
      inPath: polyline(geo.inLine),
      outPath: smoothPath(geo.outLine),
      outArea: smoothPath(geo.outLine, baseline + 4),
      gaps: geo.hasIncome ? gapSegments(geo.inLine, dense).map((g) => ({ kind: g.kind, path: polyline([...g.polygon, g.polygon[0]!]) })) : [],
    };
  }, [geo, dense, height]);

  const growOut = useSharedValue(reduced ? 1 : 0);
  const growIn = useSharedValue(reduced ? 1 : 0);
  const fill = useSharedValue(reduced ? 1 : 0);
  const pulse = useSharedValue(0);
  React.useEffect(() => {
    if (reduced) return;
    growOut.value = withDelay(OUT_DELAY, withTiming(1, { duration: OUT_MS, easing: easeOutQuint }));
    growIn.value = withDelay(geo.hasIncome ? IN_DELAY : 0, withTiming(1, { duration: IN_MS, easing: easeOutQuint }));
    fill.value = withDelay(FILL_DELAY, withTiming(1, { duration: 350 }));
    pulse.value = withDelay(FILL_DELAY, withTiming(1, { duration: 560 }));
  }, [reduced, geo.hasIncome, growOut, growIn, fill, pulse]);

  const outPoly = React.useMemo(() => buildPolyPath(dense.map(([x, y]) => ({ x, y }))), [dense]);
  const inPoly = React.useMemo(() => buildPolyPath(geo.inLine.map(([x, y]) => ({ x, y }))), [geo]);
  const outX = useDerivedValue(() => pointAt(outPoly, growOut.value).x);
  const outY = useDerivedValue(() => pointAt(outPoly, growOut.value).y);
  const inX = useDerivedValue(() => pointAt(inPoly, growIn.value).x);
  const inY = useDerivedValue(() => pointAt(inPoly, growIn.value).y);
  const outComet = useDerivedValue(() => (growOut.value >= 1 ? 0 : Math.min(1, growOut.value * 20, (1 - growOut.value) * 10)));
  const inComet = useDerivedValue(() => (growIn.value >= 1 || growIn.value <= 0 ? 0 : Math.min(1, growIn.value * 20, (1 - growIn.value) * 10)));
  const outDot = useDerivedValue(() => Math.min(Math.max((growOut.value - 0.8) / 0.2, 0), 1));
  const inDot = useDerivedValue(() => Math.min(Math.max((growIn.value - 0.8) / 0.2, 0), 1));
  const ringR = useDerivedValue(() => 6 + pulse.value * 12);
  const ringOpacity = useDerivedValue(() => (pulse.value <= 0 || pulse.value >= 1 ? 0 : (1 - pulse.value) * 0.55));
  const outAreaOpacity = useDerivedValue(() => fill.value);

  const count = series.length;
  const gesture = useScrubGesture({
    // Day i ends at (i + 1) / count of the plot; pick the nearest day that has happened.
    indexAt: (x) => (todayIndex < 0 || count === 0 ? -1 : Math.min(todayIndex, Math.max(0, Math.round((x / Math.max(plotWidth, 1)) * count) - 1))),
    selected,
    onSelect: setSelected,
    minY: LANE - 6,
  });

  const mint = colors.income;
  const brass = colors.accent;
  const point = selected !== null && selected <= todayIndex ? series[selected] : undefined;
  const sx = selected !== null ? geo.xAt(selected) : 0;
  const spoken = point && selected !== null ? `${accessibilityLabel}. ${formatLabel(selected)}` : accessibilityLabel;
  const showIn = geo.hasIncome && geo.inEnd;

  return (
    <View onLayout={onLayout} style={{ height: LANE + height }} accessibilityLabel={accessibilityLabel} {...adjustableProps(todayIndex + 1, selected, setSelected, spoken)}>
      {width > 0 && geo.outEnd ? (
        <GestureDetector gesture={gesture}>
          <View collapsable={false}>
            <Canvas style={{ width, height: LANE + height }}>
              <Group transform={[{ translateY: LANE }]}>
                {/* Faint baseline so a near-zero line still has ground to sit on. */}
                <Line p1={vec(0, height - 4)} p2={vec(plotWidth, height - 4)} color={colors.separator} strokeWidth={0.5} />
                {showIn ? (
                  <Group opacity={outAreaOpacity}>
                    {shapes.gaps.map((g, i) => (
                      <Path key={i} path={g.path} style="fill" color={g.kind === 'in' ? withAlpha(mint, 0.12) : withAlpha(colors.expense, 0.12)} />
                    ))}
                  </Group>
                ) : (
                  <Group opacity={outAreaOpacity}>
                    <Path path={shapes.outArea} style="fill">
                      <LinearGradient start={vec(0, geo.outEnd[1])} end={vec(0, height)} colors={[withAlpha(brass, 0.2), withAlpha(brass, 0.03), withAlpha(brass, 0)]} positions={[0, 0.75, 1]} />
                    </Path>
                  </Group>
                )}
                {showIn ? <Path path={shapes.inPath} style="stroke" strokeWidth={2.25} color={mint} strokeCap="round" strokeJoin="round" start={0} end={growIn} /> : null}
                <Path path={shapes.outPath} style="stroke" strokeWidth={2.5} color={brass} strokeCap="round" strokeJoin="round" start={0} end={growOut} />
                {reduced ? null : (
                  <>
                    <Circle cx={outX} cy={outY} r={7} color={brass} opacity={outComet}>
                      <BlurMask blur={7} style="normal" />
                    </Circle>
                    <Circle cx={outX} cy={outY} r={2.5} color="#FFFFFF" opacity={outComet} />
                    {showIn ? (
                      <>
                        <Circle cx={inX} cy={inY} r={7} color={mint} opacity={inComet}>
                          <BlurMask blur={7} style="normal" />
                        </Circle>
                        <Circle cx={inX} cy={inY} r={2.5} color="#FFFFFF" opacity={inComet} />
                        <Circle cx={geo.inEnd![0]} cy={geo.inEnd![1]} r={ringR} color={mint} opacity={ringOpacity} />
                      </>
                    ) : null}
                    <Circle cx={geo.outEnd[0]} cy={geo.outEnd[1]} r={ringR} color={brass} opacity={ringOpacity} />
                  </>
                )}
                {showIn ? <EndDot at={geo.inEnd!} color={mint} bg={colors.bg} opacity={inDot} /> : null}
                <EndDot at={geo.outEnd} color={brass} bg={colors.bg} opacity={outDot} />
                {point && selected !== null ? (
                  <Group>
                    <Line p1={vec(sx, 0)} p2={vec(sx, height - 4)} color={withAlpha(colors.text, 0.18)} strokeWidth={1} />
                    {showIn ? (
                      <>
                        <Circle cx={sx} cy={geo.yAt(point.in ?? 0)} r={5} color={colors.bg} />
                        <Circle cx={sx} cy={geo.yAt(point.in ?? 0)} r={3.5} color={mint} />
                      </>
                    ) : null}
                    <Circle cx={sx} cy={geo.outLine[selected + 1]?.[1] ?? 0} r={5} color={colors.bg} />
                    <Circle cx={sx} cy={geo.outLine[selected + 1]?.[1] ?? 0} r={3.5} color={brass} />
                  </Group>
                ) : null}
              </Group>
              {point && selected !== null && labelFont ? <FloatingLabel text={formatLabel(selected)} font={labelFont} centerX={sx} y={0} totalWidth={width} /> : null}
            </Canvas>
          </View>
        </GestureDetector>
      ) : null}
    </View>
  );
}

export { CumulativeDuo };
