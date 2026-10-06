import { Platform } from 'react-native';

import { AppIcon } from '@/icons/app-icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { haptic } from '@/theme/haptics';
import { useTokens } from '@/theme/use-tokens';

type MonthPillProps = { label: string; onPress: () => void; /** Jumps back to the current month. */ onLongPress?: () => void };

/** Leading header control: "Oct 2026 ⌄". */
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
      className="h-8 flex-row items-center gap-1.5 rounded-full bg-accent-soft px-3"
    >
      <Text variant="callout" tone="accent" numeric numberOfLines={1}>
        {label}
      </Text>
      <AppIcon name="chevron.down" size={10} color={colors.accent} />
    </Pressable>
  );
}

export { MonthPill };
