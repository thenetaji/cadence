import { Canvas, Circle, Path, Skia, type SkPath } from '@shopify/react-native-skia';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { useDerivedValue } from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { donutSegments, hitTestDonut } from '@/lib/charts';
import { haptic } from '@/theme/haptics';
import { useTokens } from '@/theme/use-tokens';
import { useGrow } from './chart-kit';

export type DonutDatum = {
  key: string;
  /** Used for the centre label and the accessibility label. */
  name: string;
  /** Minor units, drives the segment size. */
  value: number;
  /** Pre-formatted amount for the centre label. */
  amountLabel: string;
  /** Share, e.g. "34%". */
  percentLabel: string;
  color: string;
};

export type DonutProps = {
  data: readonly DonutDatum[];
  selectedKey: string | null;
  onSelect: (key: string | null) => void;
  accessibilityLabel: string;
  /** Empty ring text, when there is no data. */
  emptyLabel?: string;
  size?: number;
};

const STROKE = 22;
const GROW = 4;
const GAP = 2;

type SegmentProps = { path: SkPath; color: string; stroke: number; startDeg: number; sweepDeg: number; dimmed: boolean; grow: ReturnType<typeof useGrow> };

function Segment({ path, color, stroke, startDeg, sweepDeg, dimmed, grow }: SegmentProps) {
  // Reveal clockwise: each segment's trim end follows the global sweep angle.
  const end = useDerivedValue(() => {
    if (sweepDeg <= 0) return 0;
    const visibleDeg = grow.value * 360 - (startDeg + 90);
    return Math.min(1, Math.max(0, visibleDeg / sweepDeg));
  });
  return <Path path={path} style="stroke" strokeWidth={stroke} color={color} opacity={dimmed ? 0.35 : 1} start={0} end={end} />;
}

function Donut({ data, selectedKey, onSelect, accessibilityLabel, emptyLabel, size = 180 }: DonutProps) {
  const { colors } = useTokens();
  const grow = useGrow();
  const half = size / 2;
  const baseOuter = half - GROW;
  const radius = baseOuter - STROKE / 2;
  const inner = radius - STROKE / 2;
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const segments = React.useMemo(() => donutSegments(data.map((d) => d.value), GAP), [data]);
  const selectedIndex = selectedKey === null ? -1 : data.findIndex((d) => d.key === selectedKey);
  const selected = selectedIndex >= 0 ? data[selectedIndex] : undefined;
  // Nothing selected: the centre names the biggest category; the total lives in the hero above.
  const leader = React.useMemo(() => data.reduce<DonutDatum | undefined>((best, d) => (!best || d.value > best.value ? d : best), undefined), [data]);

  const paths = React.useMemo(
    () =>
      segments.map((segment, index) => {
        const r = index === selectedIndex ? radius + GROW / 2 : radius;
        const builder = Skia.PathBuilder.Make();
        if (segment.sweep > 0) builder.addArc({ x: half - r, y: half - r, width: r * 2, height: r * 2 }, segment.start, segment.sweep);
        return builder.build();
      }),
    [segments, selectedIndex, radius, half],
  );

  const tap = Gesture.Tap()
    .runOnJS(true)
    .onEnd((event, success) => {
      if (!success) return;
      const hit = hitTestDonut(event.x, event.y, half, half, inner, baseOuter + GROW, segments);
      const next = hit >= 0 ? data[hit]?.key : undefined;
      if (next === undefined || next === selectedKey) {
        if (selectedKey !== null) onSelect(null);
        return;
      }
      haptic('selection');
      onSelect(next);
    });

  return (
    <View style={{ width: size, height: size }} accessibilityLabel={accessibilityLabel} accessible={data.length === 0}>
      <GestureDetector gesture={tap}>
        <View collapsable={false}>
          <Canvas style={{ width: size, height: size }}>
            {total === 0 ? (
              <Circle cx={half} cy={half} r={radius} style="stroke" strokeWidth={StyleSheet.hairlineWidth * 2} color={colors.separator} />
            ) : (
              <>
                {data.map((d, i) => (
                  <Segment
                    key={d.key}
                    path={paths[i]!}
                    color={d.color}
                    stroke={i === selectedIndex ? STROKE + GROW : STROKE}
                    startDeg={segments[i]!.start}
                    sweepDeg={segments[i]!.sweep}
                    dimmed={selectedIndex >= 0 && i !== selectedIndex}
                    grow={grow}
                  />
                ))}
              </>
            )}
          </Canvas>
        </View>
      </GestureDetector>
      <View pointerEvents="none" className="absolute inset-0 items-center justify-center" style={{ paddingHorizontal: STROKE + GROW + 12 }}>
        {selected ? (
          <>
            <Text variant="footnote" tone="secondary" numberOfLines={1} className="text-center">
              {selected.name}
            </Text>
            <Text variant="title2" numeric numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} className="text-center">
              {selected.amountLabel}
            </Text>
            <Text variant="footnote" tone="secondary" numeric>
              {selected.percentLabel}
            </Text>
          </>
        ) : leader && total > 0 ? (
          <>
            <Text variant="footnote" tone="secondary" numberOfLines={1} className="text-center">
              {leader.name}
            </Text>
            <Text variant="title2" numeric numberOfLines={1} className="text-center">
              {leader.percentLabel}
            </Text>
          </>
        ) : emptyLabel ? (
          <Text variant="footnote" tone="tertiary">
            {emptyLabel}
          </Text>
        ) : null}
      </View>
      {data.map((d, i) => {
        const segment = segments[i];
        if (!segment || segment.sweep <= 0) return null;
        const rad = (segment.mid * Math.PI) / 180;
        const cx = half + Math.cos(rad) * radius;
        const cy = half + Math.sin(rad) * radius;
        return (
          <View
            key={d.key}
            pointerEvents="none"
            accessible
            accessibilityRole="button"
            accessibilityLabel={`${d.name}, ${d.amountLabel}, ${d.percentLabel}`}
            accessibilityState={{ selected: d.key === selectedKey }}
            accessibilityActions={[{ name: 'activate' }]}
            onAccessibilityAction={() => onSelect(d.key === selectedKey ? null : d.key)}
            style={{ position: 'absolute', left: cx - 22, top: cy - 22, width: 44, height: 44 }}
          />
        );
      })}
    </View>
  );
}

export { Donut };
