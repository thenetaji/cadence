import { StyleSheet, View, type ViewProps } from 'react-native';

import { useTokens } from '@/theme/use-tokens';

type SeparatorProps = ViewProps & { inset?: number };

function Separator({ inset = 0, style, ...props }: SeparatorProps) {
  const { colors } = useTokens();
  return (
    <View
      accessibilityRole="none"
      style={[{ height: StyleSheet.hairlineWidth, marginLeft: inset, backgroundColor: colors.separator }, style]}
      {...props}
    />
  );
}

export { Separator };
