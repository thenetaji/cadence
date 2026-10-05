import { StyleSheet, View } from 'react-native';

import { SymbolIcon } from '@/components/app/symbol';
import { withAlpha, type CategoryColorKey } from '@/theme/tokens';
import { useTokens } from '@/theme/use-tokens';

type IconTileProps = {
  icon: string;
  color: CategoryColorKey;
  size?: number;
  radius?: number;
  splitBadge?: boolean;
};

function IconTile({ icon, color, size = 36, radius = 10, splitBadge = false }: IconTileProps) {
  const { category, colors, isDark } = useTokens();
  const tint = category[color];
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: withAlpha(tint, isDark ? 0.22 : 0.15),
        }}
        className="items-center justify-center"
      >
        <SymbolIcon name={icon} size={Math.round(size * 0.5)} color={tint} />
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
