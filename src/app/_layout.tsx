import '../global.css';

import { PortalHost } from '@rn-primitives/portal';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastHost } from '@/components/app/toast-host';
import { followWebColorScheme } from '@/theme/theme';

followWebColorScheme();

const subscribeNothing = () => () => undefined;

export default function RootLayout() {
  const mounted = useSyncExternalStore(subscribeNothing, () => true, () => Platform.OS !== 'web');
  if (!mounted) return null;
  return (
    <GestureHandlerRootView className="flex-1 bg-bg">
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }} />
        <PortalHost />
        <ToastHost />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
