import * as React from 'react';
import { View } from 'react-native';

import { SymbolIcon } from '@/components/app/symbol';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import type { CategoryColorKey } from '@/theme/tokens';
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
  const iconColor = selected ? colors.accentText : colors.textSecondary;
  return (
    <Pressable
      role="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      haptic="light"
      hitSlop={{ top: 6, bottom: 6 }}
      onPress={onPress}
      className={cn('h-8 flex-row items-center gap-1.5 self-start rounded-full border px-3', selected ? 'border-accent bg-accent-soft' : 'border-transparent bg-fill')}
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
  const { ink, colors } = useTokens();
  return (
    <Pressable
      role="button"
      accessibilityState={{ selected }}
      accessibilityLabel={name}
      haptic="light"
      hitSlop={{ top: 6, bottom: 6 }}
      onPress={onPress}
      className={cn('h-8 flex-row items-center gap-1.5 self-start rounded-full border pl-1.5 pr-3', selected ? 'border-accent bg-accent-soft' : 'border-transparent bg-fill')}
    >
      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: ink[color], alignItems: 'center', justifyContent: 'center' }}>
        <SymbolIcon name={icon} size={12} color="#FFFFFF" weight="semibold" />
      </View>
      <Text variant="callout" numberOfLines={1} style={selected ? { color: colors.accentText } : { color: colors.text }}>
        {name}
      </Text>
    </Pressable>
  );
}

export { CategoryChip, Chip };
export type { CategoryChipProps, ChipProps };
