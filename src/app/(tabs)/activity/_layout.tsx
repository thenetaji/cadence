import { Stack, useRouter } from 'expo-router';

import { HeaderButton } from '@/components/app/header-button';
import { useTabStackOptions } from '@/components/app/tab-header';

export default function ActivityLayout() {
  const options = useTabStackOptions();
  const router = useRouter();
  return (
    <Stack screenOptions={options}>
      <Stack.Screen
        name="index"
        options={{
          title: 'Activity',
          headerRight: () => <HeaderButton symbol="magnifyingglass" label="Search" onPress={() => router.push('/search')} />,
        }}
      />
    </Stack>
  );
}
