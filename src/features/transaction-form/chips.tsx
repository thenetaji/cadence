import * as React from 'react';
import { View, type ViewStyle } from 'react-native';
import { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { SymbolIcon } from '@/components/app/symbol';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { durations, withAlpha, type CategoryColorKey } from '@/theme/tokens';
import { useTokens } from '@/theme/use-tokens';

type FormChipProps = {
  label: string;
  icon?: string;
  trailingIcon?: string;
  hint?: string;
  selected?: boolean;
  /** Icon colour and selected background; accent when omitted. */
  tint?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
  /** Lets the chip truncate inside a row instead of overflowing. */
  shrink?: boolean;
  /** Fixed 32 pt circle showing only the icon; `label` is then the accessibility label. */
  iconOnly?: boolean;
};

/** Pill chip whose selected state cross-fades over 200 ms. */
function FormChip({ label, icon, trailingIcon, hint, selected = false, tint, onPress, accessibilityLabel, shrink = false, iconOnly = false }: FormChipProps) {
  const { colors, isDark } = useTokens();
  const progress = useSharedValue(selected ? 1 : 0);
  React.useEffect(() => {
    progress.value = withTiming(selected ? 1 : 0, { duration: durations.chip });
  }, [selected, progress]);
  const selectedBg = tint ? withAlpha(tint, isDark ? 0.22 : 0.15) : colors.accentSoft;
  const background = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [colors.fill, selectedBg]),
  }));
  const iconColor = tint ?? (selected ? colors.accent : colors.textSecondary);
  return (
    <Pressable
      role="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      haptic="light"
      hitSlop={{ top: 6, bottom: 6 }}
      onPress={onPress}
      style={[
        {
          height: 32,
          borderRadius: 16,
          paddingHorizontal: iconOnly ? 0 : 12,
          width: iconOnly ? 32 : undefined,
          justifyContent: iconOnly ? 'center' : undefined,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          flexShrink: shrink ? 1 : 0,
          maxWidth: '100%',
        },
        background as ViewStyle,
      ]}
    >
      {icon ? <SymbolIcon name={icon} size={iconOnly ? 15 : 14} color={iconColor} /> : null}
      {iconOnly ? null : (
        <Text variant="callout" tone={selected && !tint ? 'accent' : 'default'} numberOfLines={1} className="shrink">
          {label}
        </Text>
      )}
      {hint ? (
        <Text variant="callout" tone="secondary" numeric numberOfLines={1}>
          {hint}
        </Text>
      ) : null}
      {trailingIcon ? <SymbolIcon name={trailingIcon} size={9} color={colors.textTertiary} weight="bold" /> : null}
    </Pressable>
  );
}

type CategoryPillProps = {
  name: string;
  icon: string;
  color: CategoryColorKey;
  selected?: boolean;
  onPress?: () => void;
};

function CategoryPill({ name, icon, color, selected = false, onPress }: CategoryPillProps) {
  const { category } = useTokens();
  return <FormChip label={name} icon={icon} tint={category[color]} selected={selected} onPress={onPress} />;
}

function Hairline() {
  const { colors } = useTokens();
  return <View style={{ height: 0.5, backgroundColor: colors.separator, marginLeft: 16 }} />;
}

export { CategoryPill, FormChip, Hairline };
