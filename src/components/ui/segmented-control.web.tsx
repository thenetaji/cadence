import { Pressable, View } from 'react-native';

import type { SegmentedControlProps } from '@/components/ui/segmented-control.types';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { useTokens } from '@/theme/use-tokens';

function SegmentedControl({ values, selectedIndex, onChange, accessibilityLabel, className }: SegmentedControlProps) {
  const { isDark } = useTokens();
  return (
    <View
      role="tablist"
      accessibilityLabel={accessibilityLabel}
      className={cn('h-8 flex-row rounded-[9px] bg-fill p-0.5', className)}
    >
      {values.map((label, index) => {
        const selected = index === selectedIndex;
        return (
          <Pressable
            key={label}
            role="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(index)}
            className={cn(
              'flex-1 items-center justify-center rounded-[7px]',
              selected && (isDark ? 'bg-[#636366]' : 'bg-surface'),
            )}
            style={selected && !isDark ? { boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 0 1px rgba(0,0,0,0.08)' } : undefined}
          >
            <Text variant="footnote" className={selected ? 'font-semibold' : 'font-medium'} numberOfLines={1}>
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
