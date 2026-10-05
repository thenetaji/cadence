import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { dynamicType } from '@/theme/tokens';

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
        <Text
          numeric
          variant="amountEntry"
          tone={empty ? 'tertiary' : 'default'}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={32 / 44}
          maxFontSizeMultiplier={dynamicType.hero}
          className="min-w-0 shrink"
        >
          {value === '' ? '0' : value}
        </Text>
      </View>
    </Pressable>
  );
}

export { AmountReadout };
export type { AmountReadoutProps };
