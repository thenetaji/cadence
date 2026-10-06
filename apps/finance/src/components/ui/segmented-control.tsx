import NativeSegmentedControl from '@react-native-segmented-control/segmented-control';
import * as React from 'react';
import { View } from 'react-native';

import type { SegmentedControlProps } from '@/components/ui/segmented-control.types';
import { haptic } from '@/theme/haptics';
import { useTokens } from '@/theme/use-tokens';

function SegmentedControl({ values, selectedIndex, onChange, accessibilityLabel, className, disabled = false, disabledIndexes }: SegmentedControlProps) {
  const { scheme } = useTokens();
  // The native control has no per-segment disabled state: a tap on one is reverted by remounting.
  const [revert, setRevert] = React.useState(0);
  return (
    <View className={className} accessibilityLabel={accessibilityLabel} accessibilityState={{ disabled }} style={disabled ? { opacity: 0.45 } : undefined}>
      <NativeSegmentedControl
        key={revert}
        values={[...values]}
        selectedIndex={selectedIndex}
        enabled={!disabled}
        appearance={scheme}
        onChange={(event) => {
          const index = event.nativeEvent.selectedSegmentIndex;
          if (disabledIndexes?.includes(index)) {
            haptic('error');
            setRevert((n) => n + 1);
            return;
          }
          haptic('selection');
          onChange(index);
        }}
      />
    </View>
  );
}

export { SegmentedControl };
export type { SegmentedControlProps };
