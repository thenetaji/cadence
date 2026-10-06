import type { NativeStackNavigationOptions } from 'expo-router';
import type * as React from 'react';
import { View } from 'react-native';

import { AppIcon } from '@/icons/app-icon';
import { Pressable } from '@/components/ui/pressable';
import { useTokens } from '@/theme/use-tokens';

type HeaderButtonProps = { symbol: string; label: string; onPress: () => void };

/** Neutral 34 pt circle with a 17 pt glyph; never accent-coloured. */
function HeaderButton({ symbol, label, onPress }: HeaderButtonProps) {
  const { colors, isDark } = useTokens();
  return (
    <Pressable
      role="button"
      accessibilityLabel={label}
      hitSlop={6}
      haptic="light"
      scale={0.92}
      onPress={onPress}
      className="mx-0.5 h-11 w-11 items-center justify-center"
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: isDark ? colors.elevated : colors.fill,
          borderWidth: isDark ? 1 : 0,
          borderColor: colors.border,
        }}
        className="items-center justify-center"
      >
        <AppIcon name={symbol} size={17} color={colors.text} />
      </View>
    </Pressable>
  );
}

export { HeaderButton };
export type { HeaderButtonProps };

/**
 * iOS 26 wraps every bar item in a shared Liquid Glass capsule, which turns a text button into a grey
 * pill. Custom items with `hidesSharedBackground` render bare, so plain text and our own circles stay as drawn.
 * Spread the result into screen options in place of `headerLeft` / `headerRight`.
 */
function barLeft(element: React.ReactElement): Pick<NativeStackNavigationOptions, 'headerLeft' | 'unstable_headerLeftItems'> {
  // `headerLeft` serves web and Android; on iOS the items below take over.
  return { headerLeft: () => element, unstable_headerLeftItems: () => [{ type: 'custom', element, hidesSharedBackground: true }] };
}
function barRight(element: React.ReactElement | null): Pick<NativeStackNavigationOptions, 'headerRight' | 'unstable_headerRightItems'> {
  return { headerRight: () => element, unstable_headerRightItems: () => (element ? [{ type: 'custom', element, hidesSharedBackground: true }] : []) };
}

export { barLeft, barRight };
