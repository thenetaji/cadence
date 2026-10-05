import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

type EmptyStateProps = { message: string; actionLabel: string; onAction: () => void };

function EmptyState({ message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View className="items-center gap-4 px-6 py-12">
      <Text variant="callout" tone="secondary" className="text-center">
        {message}
      </Text>
      <Button variant="secondary" onPress={onAction}>
        {actionLabel}
      </Button>
    </View>
  );
}

export { EmptyState };
export type { EmptyStateProps };
