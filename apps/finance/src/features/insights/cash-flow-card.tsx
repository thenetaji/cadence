import * as React from 'react';
import { View } from 'react-native';

import { SectionHeader , Card , Text } from '@studio/ui';
import { axisLabels } from '@studio/charts/lib';
import { CashFlowChart } from '@studio/charts/components';
import type { CashFlowData } from '@/data/hooks';
import { formatMoneyForSpeech } from '@studio/money';
import { useTokens } from '@studio/theme';

import { flowAmount, flowScrub } from './labels';

type CashFlowCardProps = { flow: CashFlowData; locale?: string };

function LegendItem({ color, text, line }: { color: string; text: string; line?: boolean }) {
  return (
    <View className="flex-row items-center">
      <View style={line ? { width: 12, height: 2, borderRadius: 1, backgroundColor: color } : { width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Text variant="footnote" tone="secondary" className="ml-1.5">
        {text}
      </Text>
    </View>
  );
}

/** "Cash flow": income above the zero line, spending below, with the running net over both. */
const CashFlowCard = React.memo(function CashFlowCard({ flow, locale }: CashFlowCardProps) {
  const { colors } = useTokens();
  const [scrub, setScrub] = React.useState<number | null>(null);
  const labels = React.useMemo(() => axisLabels(flow.points.map((p) => p.key), flow.granularity), [flow.points, flow.granularity]);
  const net = flow.totalIn - flow.totalOut;
  const summary = `Cash flow. In ${formatMoneyForSpeech(flow.totalIn, flow.currency, { sign: 'none', locale })}, out ${formatMoneyForSpeech(flow.totalOut, flow.currency, { sign: 'none', locale })}`;
  return (
    <>
      <SectionHeader title="Cash flow" />
      <Card className="mx-4 rounded-[16px] px-4 pb-1 pt-3">
        <View className="flex-row items-center justify-between pb-1">
          <View className="flex-row items-center gap-4">
            <LegendItem color={colors.income} text="In" />
            <LegendItem color={colors.accent} text="Out" />
            <LegendItem color={colors.textSecondary} text="Net" line />
          </View>
          <Text variant="footnote" tone="tertiary" numeric>
            {`Net ${flowAmount(net, flow.currency, locale, 'auto')}`}
          </Text>
        </View>
        <CashFlowChart
          data={flow.points}
          currency={flow.currency}
          locale={locale}
          labels={labels}
          selectedIndex={scrub}
          onSelect={setScrub}
          formatLabel={(i) => (flow.points[i] ? flowScrub(flow.points[i]!, flow.granularity, flow.currency, locale) : '')}
          accessibilityLabel={summary}
        />
      </Card>
    </>
  );
});

export { CashFlowCard };
