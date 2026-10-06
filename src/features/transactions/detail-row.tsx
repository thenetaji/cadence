import { StyleSheet, View } from 'react-native';

import { IconTile } from '@/components/app/icon-tile';
import { SymbolIcon } from '@/components/app/symbol';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import type { CategoryColorKey } from '@/theme/tokens';
import { useTokens } from '@/theme/use-tokens';

type DetailRowProps = {
  label: string;
  value?: string;
  /** Small coloured tile before the value. */
  tile?: { icon: string; color: CategoryColorKey };
  /** Coloured tile at the row's leading edge. */
  leading?: { icon: string; color: CategoryColorKey };
  /** Secondary line under the value. */
  caption?: string;
  /** Label above the value, for long text such as a memo. */
  stacked?: boolean;
  numeric?: boolean;
  chevron?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  showSeparator?: boolean;
};

/** One line of the transaction detail's grouped list: label left, value right (or stacked). */
function DetailRow({ label, value, tile, leading, caption, stacked = false, numeric = false, chevron = false, onPress, accessibilityLabel, showSeparator = false }: DetailRowProps) {
  const { colors } = useTokens();
  return (
    <Pressable
      role={onPress ? 'button' : undefined}
      accessible
      accessibilityLabel={accessibilityLabel ?? [label, value].filter(Boolean).join(', ')}
      disabled={!onPress}
      scale={1}
      onPress={onPress}
      className={`min-h-[48px] bg-surface px-4 py-3 active:bg-fill ${stacked ? 'gap-1' : 'flex-row items-center gap-3'}`}
    >
      {leading ? <IconTile icon={leading.icon} color={leading.color} size={28} /> : null}
      <Text
        variant={stacked ? 'footnote' : 'body'}
        tone={leading ? 'default' : 'secondary'}
        numberOfLines={1}
        className={stacked ? '' : leading ? 'flex-1' : 'shrink-0'}
      >
        {label}
      </Text>
      <View className={stacked ? '' : leading ? 'items-end' : 'flex-1 flex-row items-center justify-end gap-2'}>
        {tile ? <IconTile icon={tile.icon} color={tile.color} size={24} /> : null}
        <View className={stacked ? '' : 'shrink items-end'}>
          <Text variant="body" numeric={numeric} numberOfLines={stacked ? undefined : 1} className={stacked ? '' : 'text-right'}>
            {value}
          </Text>
          {caption ? (
            <Text variant="footnote" tone="secondary" numeric numberOfLines={1}>
              {caption}
            </Text>
          ) : null}
        </View>
        {chevron ? <SymbolIcon name="chevron.right" size={13} color={colors.textTertiary} weight="semibold" /> : null}
      </View>
      {showSeparator ? (
        <View
          pointerEvents="none"
          style={{ left: 16, height: StyleSheet.hairlineWidth, backgroundColor: colors.separator }}
          className="absolute bottom-0 right-0"
        />
      ) : null}
    </Pressable>
  );
}

export { DetailRow };
export type { DetailRowProps };
