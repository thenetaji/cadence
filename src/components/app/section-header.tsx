import { View } from 'react-native';

import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { pressOpacity } from '@/theme/tokens';

type SectionHeaderProps = { title: string; actionLabel?: string; onAction?: () => void };

function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <View className="min-h-11 flex-row items-center justify-between px-4">
      <Text variant="headline" accessibilityRole="header">
        {title}
      </Text>
      {actionLabel ? (
        <Pressable
          role="button"
          scale={1}
          dimTo={pressOpacity.text}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={onAction}
          className="h-11 justify-center"
        >
          <Text variant="callout" tone="accent">
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export { SectionHeader };
export type { SectionHeaderProps };
