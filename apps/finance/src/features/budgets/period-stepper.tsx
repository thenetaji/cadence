import { View } from 'react-native';

import { AppIcon } from '@/icons/app-icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { haptic , useTokens } from '@studio/theme';

type StepButtonProps = { symbol: string; label: string; disabled?: boolean; onPress: () => void };

function StepButton({ symbol, label, disabled, onPress }: StepButtonProps) {
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
      <AppIcon name={symbol} size={18} color={disabled ? colors.textTertiary : colors.accent} />
    </Pressable>
  );
}

type PeriodStepperProps = {
  label: string;
  canForward: boolean;
  onStep: (direction: 1 | -1) => void;
  /** Tapping the title; the screen jumps to the current period. Inert when omitted. */
  onTitlePress?: () => void;
};

/** Previous / next period around the current period's label. */
function PeriodStepper({ label, canForward, onStep, onTitlePress }: PeriodStepperProps) {
  return (
    <View className="flex-row items-center justify-between px-2">
      <StepButton symbol="chevron.left" label="Previous period" onPress={() => onStep(-1)} />
      <Pressable
        role={onTitlePress ? 'button' : undefined}
        disabled={!onTitlePress}
        scale={1}
        dimTo={0.6}
        onPress={onTitlePress}
        accessibilityLabel={onTitlePress ? `${label}, go to current period` : label}
        className="h-11 justify-center"
      >
        <Text variant="headline" numberOfLines={1} className="text-center" accessibilityRole="header">
          {label}
        </Text>
      </Pressable>
      <StepButton symbol="chevron.right" label="Next period" disabled={!canForward} onPress={() => onStep(1)} />
    </View>
  );
}

export { PeriodStepper };
