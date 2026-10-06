import { View } from 'react-native';

import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { pressOpacity } from '@studio/theme';

type SectionHeaderProps = { title: string; actionLabel?: string; onAction?: () => void };

function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <View className="flex-row items-center justify-between px-4 pb-2 pt-6">
      <Text variant="headline" accessibilityRole="header">
        {title}
      </Text>
      {actionLabel ? (
        <Pressable
          role="button"
          scale={1}
          dimTo={pressOpacity.text}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={onAction}
          className="justify-center"
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
