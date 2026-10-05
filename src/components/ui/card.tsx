import * as React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { cn } from '@/lib/utils';
import { useTokens } from '@/theme/use-tokens';

function Card({ className, style, ...props }: ViewProps) {
  const { isDark, colors } = useTokens();
  return (
    <View
      className={cn('overflow-hidden rounded-[14px] bg-surface p-4', className)}
      style={[isDark ? null : { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border }, style]}
      {...props}
    />
  );
}

export { Card };
