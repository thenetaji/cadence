import * as React from 'react';

import { SymbolIcon } from '@/components/app/symbol';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { withAlpha, type CategoryColorKey } from '@/theme/tokens';
import { useTokens } from '@/theme/use-tokens';

type ChipProps = {
  label: string;
  selected?: boolean;
  icon?: string;
  trailingIcon?: string;
  hint?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
};

function Chip({ label, selected = false, icon, trailingIcon, hint, onPress, accessibilityLabel }: ChipProps) {
  const { colors } = useTokens();
  const iconColor = selected ? colors.accent : colors.textSecondary;
  return (
    <Pressable
      role="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      haptic="light"
      hitSlop={{ top: 6, bottom: 6 }}
      onPress={onPress}
      className={cn('h-8 flex-row items-center gap-1.5 self-start rounded-full px-3', selected ? 'bg-accent-soft' : 'bg-fill')}
    >
      {icon ? <SymbolIcon name={icon} size={14} color={iconColor} /> : null}
      <Text variant="callout" tone={selected ? 'accent' : 'default'} numberOfLines={1}>
        {label}
      </Text>
      {hint ? (
        <Text variant="callout" tone="secondary" numeric numberOfLines={1}>
          {hint}
        </Text>
      ) : null}
      {trailingIcon ? <SymbolIcon name={trailingIcon} size={10} color={iconColor} weight="semibold" /> : null}
    </Pressable>
  );
}

type CategoryChipProps = {
  name: string;
  icon: string;
  color: CategoryColorKey;
  selected?: boolean;
  onPress?: () => void;
};

function CategoryChip({ name, icon, color, selected = false, onPress }: CategoryChipProps) {
  const { category, colors, isDark } = useTokens();
  const tint = category[color];
  return (
    <Pressable
      role="button"
      accessibilityState={{ selected }}
      accessibilityLabel={name}
      haptic="light"
      hitSlop={{ top: 6, bottom: 6 }}
      onPress={onPress}
      className={cn('h-8 flex-row items-center gap-1.5 self-start rounded-full px-3', !selected && 'bg-fill')}
      style={selected ? { backgroundColor: withAlpha(tint, isDark ? 0.22 : 0.15) } : undefined}
    >
      <SymbolIcon name={icon} size={14} color={tint} />
      <Text variant="callout" numberOfLines={1} style={selected ? undefined : { color: colors.text }}>
        {name}
      </Text>
    </Pressable>
  );
}

export { CategoryChip, Chip };
export type { CategoryChipProps, ChipProps };
