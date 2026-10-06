import { Stack, useRouter } from 'expo-router';

import { Button } from '@/components/ui/button';
import { useTokens } from '@/theme/use-tokens';

export default function SettingsLayout() {
  const router = useRouter();
  const { colors } = useTokens();
  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: 'minimal',
        headerShadowVisible: false,
        headerTintColor: colors.accent,
        headerTitleStyle: { color: colors.text },
        headerStyle: { backgroundColor: colors.bg },
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Settings',
          headerBackVisible: false,
          headerLeft: () => null,
          headerRight: () => (
            <Button variant="plainText" size="sm" onPress={() => router.dismiss()}>
              Done
            </Button>
          ),
        }}
      />
      <Stack.Screen name="appearance" options={{ title: 'Theme' }} />
      <Stack.Screen name="currency" options={{ title: 'Display currency' }} />
      <Stack.Screen name="lock" options={{ title: 'Face ID' }} />
      <Stack.Screen name="categories/index" options={{ title: 'Categories' }} />
      <Stack.Screen
        name="categories/[id]"
        options={{
          title: 'Category',
          presentation: 'formSheet',
          headerShown: true,
          sheetAllowedDetents: [1],
          sheetGrabberVisible: true,
          sheetCornerRadius: 24,
        }}
      />
      <Stack.Screen name="export" options={{ title: 'Export' }} />
      <Stack.Screen name="import" options={{ title: 'Import' }} />
      <Stack.Screen name="import-preview" options={{ title: 'Preview' }} />
      <Stack.Screen name="about" options={{ title: 'About' }} />
    </Stack>
  );
}
