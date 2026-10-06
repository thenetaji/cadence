import { Platform, Switch as RNSwitch, type SwitchProps } from 'react-native';

import { haptic } from '@/theme/haptics';
import { useTokens } from '@/theme/use-tokens';

const webThumb: object = Platform.OS === 'web' ? { activeThumbColor: '#FFFFFF' } : {};

function Switch({ onValueChange, value, ...props }: Omit<SwitchProps, 'className'>) {
  const { colors } = useTokens();
  return (
    <RNSwitch
      accessibilityRole="switch"
      value={value}
      trackColor={{ false: colors.fill, true: colors.accent }}
      thumbColor="#FFFFFF"
      {...webThumb}
      ios_backgroundColor={colors.fill}
      onValueChange={(next) => {
        haptic('selection');
        onValueChange?.(next);
      }}
      {...props}
    />
  );
}

export { Switch };
