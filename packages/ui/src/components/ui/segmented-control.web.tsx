import { Pressable, View } from 'react-native';

import type { SegmentedControlProps } from './segmented-control.types';
import { Text } from './text';
import { cn } from '../../lib/utils';
import { useTokens } from '@studio/theme';

function SegmentedControl({ values, selectedIndex, onChange, accessibilityLabel, className, disabled = false, disabledIndexes }: SegmentedControlProps) {
  const { isDark } = useTokens();
  return (
    <View
      role="tablist"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={disabled ? { opacity: 0.45 } : undefined}
      className={cn('h-8 flex-row rounded-[9px] bg-fill p-0.5', className)}
    >
      {values.map((label, index) => {
        const selected = index === selectedIndex;
        const off = disabled || (disabledIndexes?.includes(index) ?? false);
        return (
          <Pressable
            key={label}
            role="tab"
            accessibilityState={{ selected }}
            disabled={off}
            onPress={() => onChange(index)}
            className={cn(
              'flex-1 items-center justify-center rounded-[7px]',
              selected && (isDark ? 'bg-[#2C2C30]' : 'bg-surface'),
            )}
            style={selected && !isDark ? { boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 0 1px rgba(0,0,0,0.08)' } : undefined}
          >
            <Text variant="footnote" tone={off && !disabled ? 'tertiary' : 'default'} className={selected ? 'font-semibold' : 'font-medium'} numberOfLines={1}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export { SegmentedControl };
export type { SegmentedControlProps };
