import type { StyleProp, ViewStyle } from 'react-native';

import { SymbolIcon } from '@/components/app/symbol';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { pressScale, shadows } from '@/theme/tokens';
import { useTokens } from '@/theme/use-tokens';

type FloatingAddButtonProps = {
  onPress: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

/** Extended pill: plus and "Add". */
function FloatingAddButton({ onPress, onLongPress, style }: FloatingAddButtonProps) {
  const { colors } = useTokens();
  return (
    <Pressable
      role="button"
      accessibilityLabel="Add transaction"
      haptic="light"
      scale={pressScale.fab}
      onPress={onPress}
      onLongPress={onLongPress}
      className="h-[52px] flex-row items-center gap-2 rounded-[26px] bg-accent pl-4 pr-5"
      style={[shadows.fab, style]}
    >
      <SymbolIcon name="plus" size={17} color={colors.onAccent} weight="bold" />
      <Text variant="headline" style={{ color: colors.onAccent }}>
        Add
      </Text>
    </Pressable>
  );
}

export { FloatingAddButton };
export type { FloatingAddButtonProps };
