import NativeSegmentedControl from '@react-native-segmented-control/segmented-control';
import { View } from 'react-native';

import type { SegmentedControlProps } from '@/components/ui/segmented-control.types';
import { haptic } from '@/theme/haptics';
import { useTokens } from '@/theme/use-tokens';

function SegmentedControl({ values, selectedIndex, onChange, accessibilityLabel, className }: SegmentedControlProps) {
  const { scheme } = useTokens();
  return (
    <View className={className} accessibilityLabel={accessibilityLabel}>
      <NativeSegmentedControl
        values={[...values]}
        selectedIndex={selectedIndex}
        appearance={scheme}
        onChange={(event) => {
          haptic('selection');
          onChange(event.nativeEvent.selectedSegmentIndex);
        }}
      />
    </View>
  );
}

export { SegmentedControl };
export type { SegmentedControlProps };
