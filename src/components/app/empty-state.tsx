import * as React from 'react';
import { View, type LayoutChangeEvent } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

type EmptyStateProps = { message: string; actionLabel?: string; onAction?: () => void };

const LIFT = 0.1;

/**
 * Centred in the space below the last fixed element, lifted 10% so it sits above optical centre.
 * The action is always a secondary button; labels are verb + object.
 */
function EmptyState({ message, actionLabel, onAction }: EmptyStateProps) {
  const [height, setHeight] = React.useState(0);
  const onLayout = React.useCallback((event: LayoutChangeEvent) => setHeight(event.nativeEvent.layout.height), []);
  return (
    <View
      onLayout={onLayout}
      className="min-h-[200px] flex-1 items-center justify-center gap-4 px-6"
      style={{ paddingBottom: height * LIFT * 2 }}
    >
      <Text variant="callout" tone="secondary" className="text-center">
        {message}
      </Text>
      {actionLabel && onAction ? (
        <Button variant="secondary" onPress={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </View>
  );
}

export { EmptyState };
export type { EmptyStateProps };
