import { View } from 'react-native';

import { SymbolIcon } from '@/components/app/symbol';
import { Pressable } from '@/components/ui/pressable';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Text } from '@/components/ui/text';
import type { PeriodType } from '@/lib/dates';
import { haptic } from '@/theme/haptics';
import { useTokens } from '@/theme/use-tokens';

const TYPES: readonly PeriodType[] = ['week', 'month', 'year', 'custom'];
const VALUES = ['Week', 'Month', 'Year', 'Custom'] as const;

type PeriodControlsProps = {
  type: PeriodType;
  label: string;
  canForward: boolean;
  onType: (type: PeriodType) => void;
  onStep: (direction: 1 | -1) => void;
  /** Tapping the label edits a custom range. */
  onEditCustom: () => void;
};

function StepButton({ symbol, label, disabled, onPress }: { symbol: string; label: string; disabled?: boolean; onPress: () => void }) {
  const { colors } = useTokens();
  return (
    <Pressable
      role="button"
      accessibilityLabel={label}
      disabled={disabled}
      scale={1}
      dimTo={0.6}
      hitSlop={6}
      onPress={() => {
        haptic('selection');
        onPress();
      }}
      className="h-11 w-11 items-center justify-center"
    >
      <SymbolIcon name={symbol} size={18} color={disabled ? colors.textTertiary : colors.accent} weight="semibold" />
    </Pressable>
  );
}

/** Week | Month | Year | Custom, with a stepper row beneath. */
function PeriodControls({ type, label, canForward, onType, onStep, onEditCustom }: PeriodControlsProps) {
  return (
    <View>
      <View className="px-4 pt-2">
        <SegmentedControl
          values={VALUES}
          selectedIndex={TYPES.indexOf(type)}
          onChange={(index) => onType(TYPES[index] ?? 'month')}
          accessibilityLabel="Period"
        />
      </View>
      <View className="flex-row items-center justify-between px-2 pt-1">
        <StepButton symbol="chevron.left" label="Previous period" onPress={() => onStep(-1)} />
        <Pressable role={type === 'custom' ? 'button' : undefined} disabled={type !== 'custom'} scale={1} dimTo={0.6} onPress={onEditCustom} accessibilityLabel={label}>
          <Text variant="headline" numberOfLines={1} className="text-center">
            {label}
          </Text>
        </Pressable>
        <StepButton symbol="chevron.right" label="Next period" disabled={!canForward} onPress={() => onStep(1)} />
      </View>
    </View>
  );
}

export { PeriodControls };
