import * as React from 'react';
import { View, type ViewStyle } from 'react-native';
import { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { AppIcon } from '@/icons/app-icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { durations, type CategoryColorKey } from '@/theme/tokens';
import { useTokens } from '@/theme/use-tokens';

type FormChipProps = {
  label: string;
  icon?: string;
  trailingIcon?: string;
  hint?: string;
  selected?: boolean;
  /** Solid tile colour for a mini category circle behind a white glyph. */
  ink?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
  /** Lets the chip truncate inside a row instead of overflowing. */
  shrink?: boolean;
  /** Fixed 32 pt circle showing only the icon; `label` is then the accessibility label. */
  iconOnly?: boolean;
};

/** Pill chip whose selected state cross-fades over 200 ms. */
function FormChip({ label, icon, trailingIcon, hint, selected = false, ink, onPress, accessibilityLabel, shrink = false, iconOnly = false }: FormChipProps) {
  const { colors } = useTokens();
  const progress = useSharedValue(selected ? 1 : 0);
  React.useEffect(() => {
    progress.value = withTiming(selected ? 1 : 0, { duration: durations.chip });
  }, [selected, progress]);
  const background = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [colors.fill, colors.accentSoft]),
    borderColor: interpolateColor(progress.value, [0, 1], ['rgba(0,0,0,0)', colors.accent]),
  }));
  const iconColor = selected ? colors.accentText : colors.textSecondary;
  return (
    <Pressable
      role="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      haptic="light"
      popWhen={selected}
      hitSlop={{ top: 6, bottom: 6 }}
      onPress={onPress}
      style={[
        {
          height: 32,
          borderWidth: 1,
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
      {icon && ink ? (
        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: ink, alignItems: 'center', justifyContent: 'center', marginLeft: -6 }}>
          <AppIcon name={icon} size={12} color="#FFFFFF" />
        </View>
      ) : icon ? (
        <AppIcon name={icon} size={iconOnly ? 15 : 14} color={iconColor} />
      ) : null}
      {iconOnly ? null : (
        <Text variant="callout" tone={selected && !ink ? 'accent' : 'default'} numberOfLines={1} className="shrink">
          {label}
        </Text>
      )}
      {hint ? (
        <Text variant="callout" tone="secondary" numeric numberOfLines={1}>
          {hint}
        </Text>
      ) : null}
      {trailingIcon ? <AppIcon name={trailingIcon} size={9} color={colors.textTertiary} /> : null}
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
  const { ink } = useTokens();
  return <FormChip label={name} icon={icon} ink={ink[color]} selected={selected} onPress={onPress} />;
}

function Hairline() {
  const { colors } = useTokens();
  return <View style={{ height: 0.5, backgroundColor: colors.separator, marginLeft: 16 }} />;
}

export { CategoryPill, FormChip, Hairline };
