import type { NativeStackNavigationOptions } from 'expo-router';

import { useTokens } from '@/theme/use-tokens';

/**
 * Header chrome shared by every stack: a solid `bg` header (true black in dark, paper in light),
 * no blur material, no hairline. `headerBlurEffect: 'none'` stops UIKit substituting a grey
 * system material, and `headerShadowVisible: false` removes the scroll-edge hairline.
 */
export function headerChrome(colors: { bg: string; accent: string; text: string }): NativeStackNavigationOptions {
  return {
    headerTransparent: false,
    headerBlurEffect: 'none',
    headerShadowVisible: false,
    headerStyle: { backgroundColor: colors.bg },
    headerTintColor: colors.accent,
    headerTitleStyle: { color: colors.text },
  };
}

export function useTabStackOptions(): NativeStackNavigationOptions {
  const { colors } = useTokens();
  return { ...headerChrome(colors), headerLargeTitleEnabled: false, contentStyle: { backgroundColor: colors.bg } };
}
