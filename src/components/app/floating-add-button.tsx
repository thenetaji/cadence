import type { StyleProp, ViewStyle } from 'react-native';

import { SymbolIcon } from '@/components/app/symbol';
import { Pressable } from '@/components/ui/pressable';
import { pressScale, shadows } from '@/theme/tokens';

type FloatingAddButtonProps = {
  onPress: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

function FloatingAddButton({ onPress, onLongPress, style }: FloatingAddButtonProps) {
  return (
    <Pressable
      role="button"
      accessibilityLabel="Add transaction"
      haptic="light"
      scale={pressScale.fab}
      onPress={onPress}
      onLongPress={onLongPress}
      className="h-14 w-14 items-center justify-center rounded-full bg-accent"
      style={[shadows.fab, style]}
    >
      <SymbolIcon name="plus" size={20} color="#FFFFFF" weight="semibold" />
    </Pressable>
  );
}

export { FloatingAddButton };
export type { FloatingAddButtonProps };
