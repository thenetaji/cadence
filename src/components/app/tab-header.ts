import type { NativeStackNavigationOptions } from 'expo-router';
import { Platform } from 'react-native';

import { useTokens } from '@/theme/use-tokens';

export function useTabStackOptions(): NativeStackNavigationOptions {
  const { colors } = useTokens();
  return {
    headerLargeTitleEnabled: false,
    headerShadowVisible: false,
    headerTransparent: Platform.OS === 'ios',
    headerBlurEffect: Platform.OS === 'ios' ? 'systemChromeMaterial' : undefined,
    headerStyle: Platform.OS === 'ios' ? undefined : { backgroundColor: colors.bg },
    headerTintColor: colors.accent,
    headerTitleStyle: { color: colors.text },
  };
}
