import * as React from 'react';
import { View } from 'react-native';

import { Text } from '@studio/ui';
import { formatMoney, formatMoneyForSpeech } from '@studio/money';
import { useTokens } from '@studio/theme';

type FlowLegendProps = {
  moneyIn: number;
  moneyOut: number;
  currency: string;
  locale?: string;
};

function Dot({ color }: { color: string }) {
  return <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />;
}

/** "● In ₹1,45,000  ● Out ₹47,804  Kept ₹97,196"; Kept turns red when overspent. */
function FlowLegend({ moneyIn, moneyOut, currency, locale }: FlowLegendProps) {
  const { colors } = useTokens();
  const fmt = (value: number, sign: 'none' | 'auto' = 'none') => formatMoney(value, currency, { locale, sign, decimals: 0 });
  const kept = moneyIn - moneyOut;
  return (
    <View
      className="mt-3 flex-row flex-wrap items-center justify-between gap-y-1"
      accessible
      accessibilityLabel={`In ${formatMoneyForSpeech(moneyIn, currency, { sign: 'none' })}, out ${formatMoneyForSpeech(moneyOut, currency, { sign: 'none' })}, ${kept < 0 ? 'overspent by' : 'kept'} ${formatMoneyForSpeech(Math.abs(kept), currency, { sign: 'none' })}`}
    >
      <View className="flex-row items-center gap-3.5">
        <View className="flex-row items-center gap-1.5">
          <Dot color={colors.income} />
          <Text variant="footnote" tone="secondary" numeric className="font-medium">
            {`In ${fmt(moneyIn)}`}
          </Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <Dot color={colors.accent} />
          <Text variant="footnote" tone="secondary" numeric className="font-medium">
            {`Out ${fmt(moneyOut)}`}
          </Text>
        </View>
      </View>
      <Text variant="footnote" numeric className="font-semibold" style={{ color: kept < 0 ? colors.expense : colors.income }}>
        {`Kept ${fmt(kept, 'auto')}`}
      </Text>
    </View>
  );
}

export { FlowLegend };
