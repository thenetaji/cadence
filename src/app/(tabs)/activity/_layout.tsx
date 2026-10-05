import { Stack, useRouter } from 'expo-router';
import { View } from 'react-native';

import { HeaderButton } from '@/components/app/header-button';
import { useTabStackOptions } from '@/components/app/tab-header';
import { useActiveFilterCount } from '@/features/activity/filter-store';

export default function ActivityLayout() {
  const options = useTabStackOptions();
  const router = useRouter();
  const filterCount = useActiveFilterCount();
  return (
    <Stack screenOptions={options}>
      <Stack.Screen
        name="index"
        options={{
          title: 'Activity',
          headerRight: () => (
            <View className="flex-row items-center">
              <HeaderButton
                symbol={filterCount > 0 ? 'line.3.horizontal.decrease.circle.fill' : 'line.3.horizontal.decrease.circle'}
                label="Filters"
                onPress={() => router.push('/activity-filters')}
              />
              <HeaderButton symbol="magnifyingglass" label="Search" onPress={() => router.push('/search')} />
            </View>
          ),
        }}
      />
    </Stack>
  );
}
