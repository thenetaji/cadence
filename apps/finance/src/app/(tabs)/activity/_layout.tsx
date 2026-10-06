import { Stack } from 'expo-router';

import { useTabStackOptions } from '@studio/ui';

export default function ActivityLayout() {
  const options = useTabStackOptions();
  // The header buttons (calendar toggle, filters, search) live in the screen: they change with the mode.
  return (
    <Stack screenOptions={options}>
      <Stack.Screen name="index" options={{ title: 'Activity' }} />
    </Stack>
  );
}
