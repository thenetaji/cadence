import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { APP_NAME } from '@/constants/app';

export default function Index() {
  return (
    <View className="flex-1 items-center justify-center bg-bg px-6">
      <Text variant="largeTitle">{APP_NAME}</Text>
    </View>
  );
}
