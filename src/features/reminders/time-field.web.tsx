import * as React from 'react';

import { useTokens } from '@/theme/use-tokens';

type TimeFieldProps = { value: string; onChange: (value: string) => void; disabled?: boolean };

export function TimeField({ value, onChange, disabled }: TimeFieldProps) {
  const { colors } = useTokens();
  return React.createElement('input', {
    type: 'time',
    value,
    disabled,
    onChange: (e: { target: { value: string } }) => e.target.value && onChange(e.target.value),
    style: { background: colors.fill, color: colors.text, border: 0, borderRadius: 8, padding: '6px 10px', fontSize: 17, fontFamily: 'inherit', colorScheme: 'dark light' },
  });
}
