import { Stack, useRouter } from 'expo-router';

import { HeaderButton } from '@/components/app/header-button';
import { useTabStackOptions } from '@/components/app/tab-header';

export default function HomeLayout() {
  const options = useTabStackOptions();
  const router = useRouter();
  return (
    <Stack screenOptions={options}>
      <Stack.Screen
        name="index"
        options={{
          title: 'Home',
          headerRight: () => <HeaderButton symbol="gearshape" label="Settings" onPress={() => router.push('/settings')} />,
        }}
      />
    </Stack>
  );
}
