import { StyleSheet, View } from 'react-native';

import { SymbolIcon } from '@/components/app/symbol';
import type { CategoryColorKey } from '@/theme/tokens';
import { useTokens } from '@/theme/use-tokens';

type IconTileProps = {
  icon: string;
  color: CategoryColorKey;
  size?: number;
  /** Ignored: tiles are always circles. Kept so existing call sites compile. */
  radius?: number;
    splitBadge?: boolean;
};

function IconTile({ icon, color, size = 36, radius: _radius, splitBadge = false }: IconTileProps) {
  const { ink, colors } = useTokens();
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: ink[color],
        }}
        className="items-center justify-center"
      >
        <SymbolIcon name={icon} size={Math.round(size * 0.5)} color="#FFFFFF" weight="semibold" />
      </View>
      {splitBadge ? (
        <View
          style={{ borderColor: colors.surface, backgroundColor: colors.fill, borderWidth: StyleSheet.hairlineWidth * 3 }}
          className="absolute -bottom-1 -right-1 h-[14px] w-[14px] items-center justify-center rounded-full"
        >
          <SymbolIcon name="square.split.2x1" size={8} color={colors.textSecondary} weight="bold" />
        </View>
      ) : null}
    </View>
  );
}

export { IconTile };
export type { IconTileProps };
