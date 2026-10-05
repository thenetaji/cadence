import '../global.css';

import { PortalHost } from '@rn-primitives/portal';
import { Stack, type NativeStackNavigationOptions } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { type ReactNode, useEffect, useSyncExternalStore } from 'react';
import { openDatabaseAsync } from 'expo-sqlite';
import { Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastHost } from '@/components/app/toast-host';
import { Text } from '@/components/ui/text';
import { useSetting, usePostDueRecurring } from '@/data/hooks';
import { DemoSeedGate } from '@/lib/demo-seed-gate';
import { setHapticsEnabled } from '@/theme/haptics';
import { applyThemePreference, followWebColorScheme } from '@/theme/theme';
import { useTokens } from '@/theme/use-tokens';

// expo-sqlite on web opens synchronously with a short busy-wait, so the worker must be live first.
const warmWorker = Platform.OS === 'web' && typeof window !== 'undefined' ? openDatabaseAsync(':memory:').then(() => undefined) : Promise.resolve();

type ProviderModule = typeof import('@/db/provider');
let loadedProvider: ProviderModule | null = null;
const providerListeners = new Set<() => void>();
void warmWorker
  .then(() => import('@/db/provider'))
  .then((module) => {
    loadedProvider = module;
    providerListeners.forEach((listener) => listener());
  });
const subscribeProvider = (listener: () => void) => {
  providerListeners.add(listener);
  return () => providerListeners.delete(listener);
};

SplashScreen.preventAutoHideAsync().catch(() => undefined);
followWebColorScheme();

export const unstable_settings = { anchor: '(tabs)' };

const subscribeNothing = () => () => undefined;

const sheet = (title: string): NativeStackNavigationOptions => ({
  title,
  presentation: 'formSheet',
  headerShown: true,
  sheetAllowedDetents: [1],
  sheetGrabberVisible: true,
  sheetCornerRadius: 24,
});

const push = (title: string): NativeStackNavigationOptions => ({
  title,
  headerShown: true,
  headerBackButtonDisplayMode: 'minimal',
});

function StartupError({ error }: { error: Error }) {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => undefined);
  }, []);
  return (
    <View className="flex-1 items-center justify-center bg-bg px-6">
      <Text variant="callout" tone="secondary" className="text-center">
        {error.message}
      </Text>
    </View>
  );
}

function Database({ children }: { children: ReactNode }) {
  const module = useSyncExternalStore(subscribeProvider, () => loadedProvider, () => null);
  if (!module) return null;
  const { DatabaseProvider } = module;
  return <DatabaseProvider errorFallback={(error) => <StartupError error={error} />}>{children}</DatabaseProvider>;
}

function Navigator() {
  usePostDueRecurring();
  const { colors } = useTokens();
  const [theme] = useSetting('theme');
  const [haptics] = useSetting('haptics');
  const [onboardingDone] = useSetting('onboarding_done');

  useEffect(() => {
    applyThemePreference(theme);
  }, [theme]);
  useEffect(() => {
    setHapticsEnabled(haptics);
  }, [haptics]);
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.accent,
        headerTitleStyle: { color: colors.text },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Protected guard={!onboardingDone}>
        <Stack.Screen name="onboarding" options={{ presentation: 'fullScreenModal', gestureEnabled: false, animation: 'fade' }} />
      </Stack.Protected>
      <Stack.Protected guard={onboardingDone}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="transaction/new" options={sheet('New transaction')} />
        <Stack.Screen name="transaction/[id]/index" options={push('Transaction')} />
        <Stack.Screen name="transaction/[id]/edit" options={sheet('Edit transaction')} />
        <Stack.Screen name="category/[id]" options={push('Category')} />
        <Stack.Screen name="budget/new" options={sheet('New budget')} />
        <Stack.Screen name="budget/[id]/index" options={push('Budget')} />
        <Stack.Screen name="budget/[id]/edit" options={sheet('Edit budget')} />
        <Stack.Screen name="recurring/index" options={push('Recurring')} />
        <Stack.Screen name="recurring/[id]" options={sheet('Edit rule')} />
        <Stack.Screen name="accounts/index" options={push('Accounts')} />
        <Stack.Screen name="accounts/new" options={sheet('New account')} />
        <Stack.Screen name="accounts/[id]/index" options={push('Account')} />
        <Stack.Screen name="accounts/[id]/edit" options={sheet('Edit account')} />
        <Stack.Screen name="search" options={sheet('Search')} />
        <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
      </Stack.Protected>
      <Stack.Screen name="dev/gallery" />
    </Stack>
  );
}

export default function RootLayout() {
  const mounted = useSyncExternalStore(subscribeNothing, () => true, () => Platform.OS !== 'web');
  if (!mounted) return null;
  return (
    <GestureHandlerRootView className="flex-1 bg-bg">
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <Database>
          <DemoSeedGate>
            <Navigator />
          </DemoSeedGate>
        </Database>
        <PortalHost />
        <ToastHost />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
