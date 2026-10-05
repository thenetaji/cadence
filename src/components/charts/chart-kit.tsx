import { Group, RoundedRect, Text as SkText, type SkFont } from '@shopify/react-native-skia';
import * as React from 'react';
import { useReducedMotion, useSharedValue, withTiming, Easing, type SharedValue } from 'react-native-reanimated';
import { Gesture } from 'react-native-gesture-handler';
import { type LayoutChangeEvent } from 'react-native';

import { clampLabelX } from '@/lib/charts';
import { haptic } from '@/theme/haptics';
import { durations } from '@/theme/tokens';
import { useTokens } from '@/theme/use-tokens';

/** Width of the container, measured once laid out. */
export function useChartWidth(): readonly [number, (event: LayoutChangeEvent) => void] {
  const [width, setWidth] = React.useState(0);
  const onLayout = React.useCallback((event: LayoutChangeEvent) => {
    const next = Math.round(event.nativeEvent.layout.width);
    setWidth((current) => (current === next ? current : next));
  }, []);
  return [width, onLayout] as const;
}

/** 0 -> 1 over 400 ms on first mount only; already 1 under Reduce Motion. */
export function useGrow(): SharedValue<number> {
  const reduced = useReducedMotion();
  const grow = useSharedValue(reduced ? 1 : 0);
  React.useEffect(() => {
    if (!reduced) grow.value = withTiming(1, { duration: durations.countUp, easing: Easing.out(Easing.cubic) });
  }, [grow, reduced]);
  return grow;
}

type FloatingLabelProps = {
  text: string;
  font: SkFont;
  /** Anchor x the pill centres on. */
  centerX: number;
  /** Top of the pill. */
  y: number;
  totalWidth: number;
};

/** Inverted pill used for scrub read-outs. */
export function FloatingLabel({ text, font, centerX, y, totalWidth }: FloatingLabelProps) {
  const { colors } = useTokens();
  const textWidth = font.getTextWidth(text);
  const padX = 10;
  const height = 24;
  const width = textWidth + padX * 2;
  const x = clampLabelX(centerX, width, totalWidth);
  return (
    <Group>
      <RoundedRect x={x} y={y} width={width} height={height} r={8} color={colors.overlay} />
      <SkText x={x + padX} y={y + 16.5} text={text} font={font} color={colors.overlayText} />
    </Group>
  );
}

type ScrubOptions = {
  /** Slot index (or nearest point) for an x position; -1 means outside the plot. */
  indexAt: (x: number) => number;
  selected: number | null;
  onSelect: (index: number | null) => void;
  /** y above which a tap counts as "elsewhere" (the label lane). Defaults to none. */
  minY?: number;
};

/** Pan scrubs and keeps the selection on release; tapping a bar selects it, tapping the selected bar or empty space clears. */
export function useScrubGesture({ indexAt, selected, onSelect, minY = -Infinity }: ScrubOptions) {
  const pick = (x: number) => {
    const index = indexAt(x);
    if (index < 0 || index === selected) return;
    haptic('selection');
    onSelect(index);
  };
  const pan = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-8, 8])
    .failOffsetY([-16, 16])
    .onStart((event) => pick(event.x))
    .onUpdate((event) => pick(event.x));
  const tap = Gesture.Tap()
    .runOnJS(true)
    .maxDuration(400)
    .onEnd((event, success) => {
      if (!success) return;
      const index = event.y < minY ? -1 : indexAt(event.x);
      if (index < 0 || index === selected) {
        if (selected !== null) onSelect(null);
        return;
      }
      haptic('selection');
      onSelect(index);
    });
  return Gesture.Race(pan, tap);
}

/** VoiceOver adjustable behaviour: swipe up/down steps through points. */
export function adjustableProps(count: number, selected: number | null, onSelect: (index: number | null) => void, valueText: string) {
  return {
    accessible: true,
    accessibilityRole: 'adjustable' as const,
    accessibilityValue: { text: valueText },
    accessibilityActions: [{ name: 'increment' as const }, { name: 'decrement' as const }],
    onAccessibilityAction: (event: { nativeEvent: { actionName: string } }) => {
      const step = event.nativeEvent.actionName === 'increment' ? 1 : -1;
      const base = selected ?? (step === 1 ? -1 : count);
      onSelect(Math.min(count - 1, Math.max(0, base + step)));
    },
  };
}
