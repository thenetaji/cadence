import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

export default function Index() {
  const [taps, setTaps] = useState(0);
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-background px-6">
      <Text variant="h1">Cadence</Text>
      <Text variant="muted">Placeholder screen</Text>
      <Button onPress={() => setTaps((n) => n + 1)}>
        <Text>Tapped {taps}</Text>
      </Button>
      <Button variant="outline" onPress={() => setTaps(0)}>
        <Text>Reset</Text>
      </Button>
    </View>
  );
}
