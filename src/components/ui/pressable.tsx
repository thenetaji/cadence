import * as React from 'react';
import { Pressable as RNPressable, type GestureResponderEvent, type PressableProps as RNPressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { haptic, type HapticKind } from '@/theme/haptics';
import { durations, pressOpacity, pressScale, springs } from '@/theme/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(RNPressable);

type PressableProps = Omit<RNPressableProps, 'style'> & {
  className?: string;
  scale?: number;
  dimTo?: number;
  haptic?: HapticKind | false;
  hapticsEnabled?: boolean;
  onPress?: (event: GestureResponderEvent) => void;
  style?: StyleProp<ViewStyle>;
};

function Pressable({
  scale = pressScale.row,
  dimTo,
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

  const animatedStyle = useAnimatedStyle(() => {
    const transform = [{ scale: withSpring(pressed.value ? scale : 1, springs.press) }];
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
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        pressed.value = 0;
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
