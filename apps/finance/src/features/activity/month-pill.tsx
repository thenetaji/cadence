import { Platform } from 'react-native';

import { AppIcon } from '@/icons/app-icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { haptic , useTokens } from '@studio/theme';

type MonthPillProps = { label: string; onPress: () => void; /** Jumps back to the current month. */ onLongPress?: () => void };

/** Leading header control: plain headline text with a chevron, like an iOS title menu: "Oct 2026 ⌄". No pill. */
function MonthPill({ label, onPress, onLongPress }: MonthPillProps) {
  const { colors } = useTokens();
  return (
    <Pressable
      role="button"
      accessibilityLabel={`Period, ${label}`}
      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
      scale={0.97}
      onPress={() => {
        haptic('selection');
        onPress();
      }}
      onLongPress={
        onLongPress
          ? () => {
              haptic('selection');
              onLongPress();
            }
          : undefined
      }
      style={Platform.OS === 'web' ? { marginLeft: 16 } : undefined}
      className="h-9 flex-row items-center gap-1 px-2"
    >
      <Text variant="headline" numeric numberOfLines={1}>
        {label}
      </Text>
      <AppIcon name="chevron.down" size={11} color={colors.textSecondary} />
    </Pressable>
  );
}

export { MonthPill };
