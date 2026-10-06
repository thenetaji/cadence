import { Stack } from 'expo-router';

import { useTabStackOptions } from '@/components/app/tab-header';

/** Home draws its own top row (month and settings), so the native header is hidden. */
export default function HomeLayout() {
  const options = useTabStackOptions();
  return (
    <Stack screenOptions={options}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
