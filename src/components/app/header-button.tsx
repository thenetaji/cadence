import { Pressable } from 'react-native';

import { SymbolIcon } from '@/components/app/symbol';
import { haptic } from '@/theme/haptics';
import { useTokens } from '@/theme/use-tokens';

type HeaderButtonProps = { symbol: string; label: string; onPress: () => void };

function HeaderButton({ symbol, label, onPress }: HeaderButtonProps) {
  const { colors } = useTokens();
  return (
    <Pressable
      role="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={() => {
        haptic('selection');
        onPress();
      }}
      className="h-11 w-11 items-center justify-center active:opacity-60"
    >
      <SymbolIcon name={symbol} size={20} color={colors.accent} weight="medium" />
    </Pressable>
  );
}

export { HeaderButton };
export type { HeaderButtonProps };
