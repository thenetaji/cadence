import { Canvas, Circle, Group, Line, Path, RoundedRect, Skia, Text as SkText, vec } from '@shopify/react-native-skia';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { useDerivedValue } from 'react-native-reanimated';

import { barSlots, flowScale, netOffsets, runningNet, slotIndex, type AxisLabel, type FlowDatum } from '@/lib/charts';
import { monotoneSegments } from '@/lib/charts/smooth';
import { formatMoney, MINUS } from '@/lib/money';
import { withAlpha } from '@/theme/tokens';
import { useTokens } from '@/theme/use-tokens';
import { adjustableProps, FloatingLabel, useChartWidth, useGrow, useScrubGesture } from './chart-kit';
import { useChartFont } from './use-chart-font';

export type CashFlowChartProps = {
  /** One entry per bucket; `income` and `spent` in minor units. */
  data: readonly FlowDatum[];
  currency: string;
  labels: readonly AxisLabel[];
  selectedIndex: number | null;
  onSelect: (index: number | null) => void;
  /** Floating read-out, e.g. "Tue 7 · In ₹0 · Out ₹1,240 · Net −₹1,240". */
  formatLabel: (index: number) => string;
  accessibilityLabel: string;
  /** Plot height (both halves together). */
  height?: number;
  locale?: string;
};

const LANE = 30;
const AXIS = 24;
const GUTTER = 44;
const RADIUS = 3;
const MIN_NUB = 2;

/**
 * Diverging bars: income rises above the zero line in mint, spending drops below it in brass, on one scale. Outliers
 * (a lump salary) are broken and labelled so normal days stay readable. A white running-net line rides on top.
 */
function CashFlowChart({ data, currency, labels, selectedIndex, onSelect, formatLabel, accessibilityLabel, height = 170, locale }: CashFlowChartProps) {
  const { colors } = useTokens();
  const [width, onLayout] = useChartWidth();
  const font = useChartFont(11, 'medium');
  const labelFont = useChartFont(12, 'semibold');
  const grow = useGrow();

  const plotWidth = Math.max(0, width - GUTTER);
  const count = data.length;
  const scale = React.useMemo(() => flowScale(data, height), [data, height]);
  const zeroY = LANE + scale.zeroY;
  const slots = React.useMemo(() => barSlots(0, plotWidth, count, count > 20 ? 2 : 6, 28), [plotWidth, count]);
  const hasData = data.some((d) => d.income > 0 || d.spent > 0);
  const net = React.useMemo(() => runningNet(data), [data]);
  const netY = React.useMemo(() => netOffsets(net, scale, height).map((o) => zeroY + o), [net, scale, height, zeroY]);
  const netPath = React.useMemo(() => {
    const b = Skia.PathBuilder.Make();
    const pts = slots.map((s, i) => [s.center, netY[i] ?? zeroY] as const);
    if (pts.length < 2) return b.build();
    b.moveTo(pts[0]![0], pts[0]![1]);
    for (const [c1x, c1y, c2x, c2y, x, y] of monotoneSegments(pts)) b.cubicTo(c1x, c1y, c2x, c2y, x, y);
    return b.build();
  }, [slots, netY, zeroY]);
  const growTransform = useDerivedValue(() => [{ translateY: zeroY }, { scaleY: grow.value }, { translateY: -zeroY }]);
  const netEnd = useDerivedValue(() => grow.value);

  const gesture = useScrubGesture({
    indexAt: (x) => (x > plotWidth ? -1 : slotIndex(x, 0, plotWidth, count)),
    selected: selectedIndex,
    onSelect,
    minY: LANE - 6,
  });

  const compact = (value: number) => formatMoney(value, currency, { compact: true, locale });
  const selected = selectedIndex !== null && selectedIndex < count ? selectedIndex : null;
  const spoken = selected === null ? accessibilityLabel : `${accessibilityLabel}. ${formatLabel(selected)}`;
  const px = scale.pxPerUnit;
  const mint = colors.income;
  const brass = colors.accent;
  const upClip = { x: 0, y: LANE - 2, width: plotWidth, height: scale.zeroY + 2 };
  const downClip = { x: 0, y: zeroY, width: plotWidth, height: height - scale.zeroY + 2 };

  const guides = [
    ...scale.upTicks.map((t) => ({ text: compact(t), y: zeroY - Math.min(t, scale.upTop) * px })),
    ...scale.downTicks.map((t) => ({ text: `${MINUS}${compact(t)}`, y: zeroY + Math.min(t, scale.downTop) * px })),
  ];

  return (
    <View onLayout={onLayout} style={{ height: LANE + height + AXIS }} accessibilityLabel={accessibilityLabel} {...adjustableProps(count, selectedIndex, onSelect, spoken)}>
      {width > 0 ? (
        <GestureDetector gesture={gesture}>
          <View collapsable={false}>
            <Canvas style={{ width, height: LANE + height + AXIS }}>
              {hasData
                ? guides.map((g, i) => (
                    <Group key={i}>
                      <Line p1={vec(0, g.y)} p2={vec(plotWidth, g.y)} color={colors.separator} strokeWidth={StyleSheet.hairlineWidth} />
                      {font ? <SkText x={width - font.getTextWidth(g.text)} y={g.y + 4} text={g.text} font={font} color={colors.textTertiary} /> : null}
                    </Group>
                  ))
                : null}
              {hasData ? (
                <Group transform={growTransform}>
                  <Group clip={upClip}>
                    {data.map((d, i) => {
                      const slot = slots[i];
                      if (!slot || d.income <= 0) return null;
                      const h = Math.max(MIN_NUB + RADIUS, Math.min(d.income, scale.upTop) * px);
                      const faded = selected !== null && selected !== i;
                      return <RoundedRect key={d.key} x={slot.x} y={zeroY - h} width={slot.width} height={h + RADIUS} r={RADIUS} color={withAlpha(mint, faded ? 0.35 : 0.9)} />;
                    })}
                  </Group>
                  <Group clip={downClip}>
                    {data.map((d, i) => {
                      const slot = slots[i];
                      if (!slot || d.spent <= 0) return null;
                      const h = Math.max(MIN_NUB + RADIUS, Math.min(d.spent, scale.downTop) * px);
                      const faded = selected !== null && selected !== i;
                      return <RoundedRect key={d.key} x={slot.x} y={zeroY - RADIUS} width={slot.width} height={h + RADIUS} r={RADIUS} color={withAlpha(brass, faded ? 0.35 : 0.9)} />;
                    })}
                  </Group>
                </Group>
              ) : null}
              <Line p1={vec(0, zeroY)} p2={vec(plotWidth, zeroY)} color={withAlpha(colors.text, 0.28)} strokeWidth={1} />
              {hasData && font
                ? data.flatMap((d, i) => {
                    const slot = slots[i];
                    if (!slot) return [];
                    const marks: React.ReactNode[] = [];
                    if (d.income > scale.upTop) {
                      const text = compact(d.income);
                      const w = font.getTextWidth(text);
                      const x = Math.min(Math.max(slot.center - w / 2, 0), width - w);
                      marks.push(
                        <Group key={`bi-${d.key}`}>
                          {[10, 17].map((dy) => (
                            <Line key={dy} p1={vec(slot.x - 3, LANE + dy + 5)} p2={vec(slot.x + slot.width + 3, LANE + dy - 5)} color={colors.surface} strokeWidth={2.5} />
                          ))}
                          {selected === i ? null : <SkText x={x} y={LANE - 5} text={text} font={font} color={colors.textSecondary} />}
                        </Group>,
                      );
                    }
                    if (d.spent > scale.downTop) {
                      const bottom = LANE + height;
                      marks.push(
                        <Group key={`bo-${d.key}`}>
                          {[-17, -10].map((dy) => (
                            <Line key={dy} p1={vec(slot.x - 3, bottom + dy + 5)} p2={vec(slot.x + slot.width + 3, bottom + dy - 5)} color={colors.surface} strokeWidth={2.5} />
                          ))}
                        </Group>,
                      );
                    }
                    return marks;
                  })
                : null}
              {hasData && count > 1 ? <Path path={netPath} style="stroke" strokeWidth={1.75} color={withAlpha(colors.text, 0.6)} strokeCap="round" strokeJoin="round" start={0} end={netEnd} /> : null}
              {selected !== null && slots[selected] ? (
                <Group>
                  <Circle cx={slots[selected]!.center} cy={netY[selected] ?? zeroY} r={4.5} color={colors.surface} />
                  <Circle cx={slots[selected]!.center} cy={netY[selected] ?? zeroY} r={3} color={colors.text} />
                </Group>
              ) : null}
              {font
                ? labels.map((label) => {
                    const slot = slots[label.index];
                    if (!slot) return null;
                    const w = font.getTextWidth(label.text);
                    const x = Math.min(Math.max(slot.center - w / 2, 0), plotWidth - w);
                    return <SkText key={label.index} x={x} y={LANE + height + 17} text={label.text} font={font} color={selected === label.index ? colors.text : colors.textTertiary} />;
                  })
                : null}
              {selected !== null && labelFont && slots[selected] ? (
                <FloatingLabel text={formatLabel(selected)} font={labelFont} centerX={slots[selected]!.center} y={0} totalWidth={width} />
              ) : null}
            </Canvas>
          </View>
        </GestureDetector>
      ) : null}
    </View>
  );
}

export { CashFlowChart };
