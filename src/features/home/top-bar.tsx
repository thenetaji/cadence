import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HeaderButton } from '@/components/app/header-button';
import { Text } from '@/components/ui/text';

/** Month name and settings; no title, since you know you are on Home. */
function HomeTopBar({ month, caption }: { month: string; caption: string }) {
  const router = useRouter();
  return (
    <SafeAreaView edges={['top']} className="bg-bg">
      <View className="min-h-[52px] flex-row items-center justify-between pl-4 pr-2">
        <View>
          <Text variant="headline" className="text-foreground" accessibilityRole="header">
            {month}
          </Text>
          <Text variant="footnote" tone="secondary" numeric>
            {caption}
          </Text>
        </View>
        <HeaderButton symbol="gearshape" label="Settings" onPress={() => router.push('/settings')} />
      </View>
    </SafeAreaView>
  );
}

export { HomeTopBar };
