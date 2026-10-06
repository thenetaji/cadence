import * as React from 'react';
import { Pressable as RNPressable, type GestureResponderEvent, type PressableProps as RNPressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';

import { usePopValue } from '@/motion/pop';

import { haptic, type HapticKind } from '@studio/theme';
import { durations, pressOpacity, pressScale, springs } from '@studio/theme';

const AnimatedPressable = Animated.createAnimatedComponent(RNPressable);

type PressableProps = Omit<RNPressableProps, 'style'> & {
  className?: string;
  scale?: number;
  dimTo?: number;
  /** Bounces (1 -> 1.08 -> 1) each time this turns true: selection feedback. */
  popWhen?: boolean;
  /** Press-and-hold expands to this scale after `holdDelay` ms (the Add pill before its menu). */
  holdScale?: number;
  holdDelay?: number;
  haptic?: HapticKind | false;
  hapticsEnabled?: boolean;
  onPress?: (event: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
};

function Pressable({
  scale = pressScale.row,
  dimTo,
  popWhen = false,
  holdScale,
  holdDelay = 220,
  haptic: hapticKind = false,
  hapticsEnabled,
  onPress,
  onPressIn,
  onPressOut,
  disabled,
  style,
  ...props
}: PressableProps) {
  const pressed = useSharedValue(0);
  const hold = useSharedValue(0);
  const pop = usePopValue(popWhen);

  const animatedStyle = useAnimatedStyle(() => {
    const target = holdScale !== undefined && hold.value > 0.5 ? holdScale : pressed.value ? scale : 1;
    const transform = [{ scale: withSpring(target, springs.press) }, { scale: pop.value }];
    if (dimTo === undefined) return { transform };
    return { transform, opacity: withTiming(pressed.value ? dimTo : 1, { duration: durations.press }) };
  });

  return (
    <AnimatedPressable
      {...props}
      disabled={disabled}
      style={[animatedStyle, style]}
      onPressIn={(event) => {
        pressed.value = 1;
        if (holdScale !== undefined) hold.value = withDelay(holdDelay, withTiming(1, { duration: 1 }));
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        pressed.value = 0;
        hold.value = 0;
        onPressOut?.(event);
      }}
      onPress={(event) => {
        if (hapticKind) haptic(hapticKind, hapticsEnabled);
        onPress?.(event);
      }}
    />
  );
}

export { Pressable, pressOpacity, pressScale };
export type { PressableProps };
