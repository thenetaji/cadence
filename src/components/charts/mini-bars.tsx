import { Canvas, Group, Line, RoundedRect, Text as SkText, vec } from '@shopify/react-native-skia';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { useDerivedValue } from 'react-native-reanimated';

import { barSlots, slotIndex, valueToY } from '@/lib/charts';
import { withAlpha } from '@/theme/tokens';
import { useTokens } from '@/theme/use-tokens';
import { adjustableProps, FloatingLabel, useChartWidth, useGrow, useScrubGesture } from './chart-kit';
import { useChartFont } from './use-chart-font';

export type MiniBarDatum = { key: string; label: string; value: number };

export type MiniBarsProps = {
  /** Oldest first; typically 6 entries. */
  data: readonly MiniBarDatum[];
  /** The period that is "now" (highlighted when nothing else is selected). */
  currentIndex: number;
  selectedIndex: number;
  onSelect: (index: number) => void;
  /** Floating amount for a bar, e.g. "₹12,400". */
  formatValue: (index: number) => string;
  color?: string;
  accessibilityLabel: string;
  height?: number;
};

const LANE = 30;
const AXIS = 24;
const RADIUS = 6;

/** Six-period bars for the category drill-down. Scrubbing and tapping both select a period. */
function MiniBars({ data, currentIndex, selectedIndex, onSelect, formatValue, color, accessibilityLabel, height = 110 }: MiniBarsProps) {
  const { colors } = useTokens();
  const [width, onLayout] = useChartWidth();
  const font = useChartFont(11, 'medium');
  const labelFont = useChartFont(12, 'semibold');
  const grow = useGrow();
  const count = data.length;
  const baseline = LANE + height;
  const peak = data.reduce((m, d) => Math.max(m, d.value), 0);
  const slots = React.useMemo(() => barSlots(0, width, count, 14, 44), [width, count]);
  const tint = color ?? colors.accent;
  const growTransform = useDerivedValue(() => [{ translateY: baseline }, { scaleY: grow.value }, { translateY: -baseline }]);

  const gesture = useScrubGesture({
    indexAt: (x) => slotIndex(x, 0, width, count),
    selected: selectedIndex,
    // Tapping the selected bar again keeps it: a period is always selected.
    onSelect: (index) => {
      if (index !== null) onSelect(index);
    },
  });

  return (
    <View
      onLayout={onLayout}
      style={{ height: LANE + height + AXIS }}
      accessibilityLabel={accessibilityLabel}
      {...adjustableProps(count, selectedIndex, (i) => i !== null && onSelect(i), `${data[selectedIndex]?.label ?? ''}, ${formatValue(selectedIndex)}`)}
    >
      {width > 0 ? (
        <GestureDetector gesture={gesture}>
          <View collapsable={false}>
            <Canvas style={{ width, height: LANE + height + AXIS }}>
              <Line p1={vec(0, baseline)} p2={vec(width, baseline)} color={colors.separator} strokeWidth={StyleSheet.hairlineWidth} />
              <Group clip={{ x: 0, y: 0, width, height: baseline }}>
                <Group transform={growTransform}>
                  {data.map((d, i) => {
                    const slot = slots[i];
                    if (!slot) return null;
                    const h = d.value > 0 && peak > 0 ? Math.max(6, baseline - valueToY(d.value, peak, baseline, height)) : 3;
                    const active = i === selectedIndex;
                    return (
                      <RoundedRect
                        key={d.key}
                        x={slot.x}
                        y={baseline - h}
                        width={slot.width}
                        height={h + RADIUS}
                        r={RADIUS}
                        color={d.value === 0 ? colors.fill : active ? tint : withAlpha(tint, i === currentIndex ? 0.7 : 0.4)}
                      />
                    );
                  })}
                </Group>
              </Group>
              {font
                ? data.map((d, i) => {
                    const slot = slots[i];
                    if (!slot) return null;
                    const f = font;
                    return (
                      <SkText
                        key={d.key}
                        x={slot.center - f.getTextWidth(d.label) / 2}
                        y={baseline + 17}
                        text={d.label}
                        font={f}
                        color={i === selectedIndex ? colors.text : colors.textTertiary}
                      />
                    );
                  })
                : null}
              {labelFont && slots[selectedIndex] ? (
                <FloatingLabel text={formatValue(selectedIndex)} font={labelFont} centerX={slots[selectedIndex]!.center} y={0} totalWidth={width} />
              ) : null}
            </Canvas>
          </View>
        </GestureDetector>
      ) : null}
    </View>
  );
}

export { MiniBars };
