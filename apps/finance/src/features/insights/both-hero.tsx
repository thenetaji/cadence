import * as React from 'react';
import { View } from 'react-native';

import { AnimatedNumber, Text } from '@studio/ui';
import { formatMoney, formatMoneyForSpeech } from '@studio/money';

type BothHeroProps = { spent: number; earned: number; currency: string; locale?: string; decimals?: number };

/** Spent and Earned side by side with the net under them (mint when ahead, coral when behind). */
const BothHero = React.memo(function BothHero({ spent, earned, currency, locale, decimals }: BothHeroProps) {
  const net = earned - spent;
  const money = (value: number) => formatMoney(value, currency, { locale, decimals });
  const speech = (value: number) => formatMoneyForSpeech(value, currency, { sign: 'none', locale });
  return (
    <View className="pt-1">
      <View className="flex-row gap-4">
        <View className="min-w-0 flex-1" accessible accessibilityLabel={`Spent, ${speech(spent)}`}>
          <Text variant="footnote" tone="secondary">
            Spent
          </Text>
          <AnimatedNumber value={money(spent)} variant="largeTitle" fit />
        </View>
        <View className="min-w-0 flex-1" accessible accessibilityLabel={`Earned, ${speech(earned)}`}>
          <Text variant="footnote" tone="secondary">
            Earned
          </Text>
          <AnimatedNumber value={money(earned)} variant="largeTitle" tone="income" fit />
        </View>
      </View>
      <View className="h-5 justify-center" accessible accessibilityLabel={`Net, ${net < 0 ? 'minus ' : ''}${speech(Math.abs(net))}`}>
        <Text variant="footnote" tone={net < 0 ? 'expense' : net > 0 ? 'income' : 'secondary'} numeric>
          {`Net ${formatMoney(net, currency, { locale, decimals, sign: 'auto' })}`}
        </Text>
      </View>
    </View>
  );
});

export { BothHero };
