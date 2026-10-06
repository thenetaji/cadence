import { View } from 'react-native';

import { SymbolIcon } from '@/components/app/symbol';
import { Pressable } from '@/components/ui/pressable';
import { useTokens } from '@/theme/use-tokens';

type HeaderButtonProps = { symbol: string; label: string; onPress: () => void };

/** Neutral 34 pt circle with a 17 pt glyph; never accent-coloured. */
function HeaderButton({ symbol, label, onPress }: HeaderButtonProps) {
  const { colors, isDark } = useTokens();
  return (
    <Pressable
      role="button"
      accessibilityLabel={label}
      hitSlop={6}
      haptic="light"
      scale={0.92}
      onPress={onPress}
      className="mx-0.5 h-11 w-11 items-center justify-center"
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: isDark ? colors.elevated : colors.fill,
          borderWidth: isDark ? 1 : 0,
          borderColor: colors.border,
        }}
        className="items-center justify-center"
      >
        <SymbolIcon name={symbol} size={17} color={colors.text} weight="semibold" />
      </View>
    </Pressable>
  );
}

export { HeaderButton };
export type { HeaderButtonProps };
