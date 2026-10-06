import { View } from 'react-native';

import { AppIcon } from '@/icons/app-icon';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { useTokens } from '@studio/theme';

type StepperProps = { value: number; min?: number; max?: number; onChange: (value: number) => void; label?: string; /** Shown after the control, e.g. `month`. */ unit?: string };

/** Round minus / value / plus control. */
function Stepper({ value, min = 1, max = 99, onChange, label = 'Value', unit }: StepperProps) {
  const { colors } = useTokens();
  const button = (symbol: string, name: string, next: number, disabled: boolean) => (
    <Pressable
      role="button"
      accessibilityLabel={name}
      haptic="light"
      disabled={disabled}
      onPress={() => onChange(next)}
      className="h-9 w-9 items-center justify-center rounded-full bg-fill"
      style={{ opacity: disabled ? 0.4 : 1 }}
    >
      <AppIcon name={symbol} size={14} color={colors.text} />
    </Pressable>
  );
  return (
    <View className="flex-row items-center gap-3">
      {button('minus', 'Decrease', value - 1, value <= min)}
      <Text variant="body" numeric className="min-w-8 text-center font-medium" accessibilityLabel={`${label} ${value}`}>
        {value}
      </Text>
      {button('plus', 'Increase', value + 1, value >= max)}
      {unit ? (
        <Text variant="body" tone="secondary" className="min-w-[60px]">
          {unit}
        </Text>
      ) : null}
    </View>
  );
}

export { Stepper };
