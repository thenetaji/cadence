import { View } from 'react-native';

import { Pressable } from '../ui/pressable';
import { Text } from '../ui/text';
import { AnimatedNumber } from './animated-number';

type AmountReadoutProps = {
  symbol: string;
  value: string;
  expression?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
};

function AmountReadout({ symbol, value, expression, onPress, accessibilityLabel }: AmountReadoutProps) {
  const empty = value === '0' || value === '';
  return (
    <Pressable
      role="button"
      scale={0.98}
      disabled={!onPress}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel ?? `${symbol}${value}`}
      className="h-[72px] items-center justify-end overflow-hidden px-4"
    >
      {expression ? (
        <Text variant="footnote" tone="secondary" numeric numberOfLines={1} className="absolute top-0">
          {expression}
        </Text>
      ) : null}
      <View className="h-[52px] max-w-full flex-row items-center justify-center gap-1">
        <Text variant="title2" tone="secondary" numberOfLines={1}>
          {symbol}
        </Text>
        <AnimatedNumber
          value={value === '' ? '0' : value}
          variant="amountEntry"
          tone={empty ? 'tertiary' : 'default'}
          align="left"
          dropNew
          fit
          className="min-w-0 shrink"
        />
      </View>
    </Pressable>
  );
}

export { AmountReadout };
export type { AmountReadoutProps };
