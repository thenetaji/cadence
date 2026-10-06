import { useRouter } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';

import { Amount } from '@/components/app/amount';
import { ProgressBar } from '@/components/app/progress-bar';
import { Card } from '@/components/ui/card';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import type { BudgetSpent, HomeSpend } from '@/data/hooks';
import { withSkia } from '@/components/charts/with-skia';
import type { PaceChartProps } from '@/components/charts/pace-chart';
import { paceMarker, perDayLeft } from '@/features/budgets/logic';
import { formatMoney, formatMoneyForSpeech } from '@/lib/money';
import { withAlpha } from '@/theme/tokens';
import { useTokens } from '@/theme/use-tokens';

type SpendHeroProps = {
  spend: HomeSpend;
  previousMonth: string;
  budget?: BudgetSpent;
  todayKey: string;
  locale?: string;
  showDecimals: boolean;
};

const noop = () => {};
/** Skia loads lazily (CanvasKit first on web), keeping chart code out of the initial graph. */
const PaceChart = withSkia<PaceChartProps>(() => import('@/components/charts/pace-chart').then((m) => ({ default: m.PaceChart })));
const CHART_HEIGHT = 110;
/** PaceChart reserves a 30 pt lane above the plot for its scrub label; Home never scrubs. */
const LANE_TRIM = 26;

function DeltaPill({ percent, previousMonth }: { percent: number; previousMonth: string }) {
  const { colors } = useTokens();
  const lower = percent < 0;
  const sign = percent < 0 ? '−' : percent > 0 ? '+' : '';
  return (
    <View
      className="rounded-full px-2.5 py-1"
      style={{ backgroundColor: lower ? withAlpha(colors.income, 0.14) : colors.fill }}
    >
      <Text variant="footnote" tone={lower ? 'income' : 'secondary'} numeric className="font-medium">
        {`${sign}${Math.abs(percent)}% vs ${previousMonth}`}
      </Text>
    </View>
  );
}

/** Month spend, change against the same day last month, the two cumulative lines and the budget line. */
function SpendHero({ spend, previousMonth, budget, todayKey, locale, showDecimals }: SpendHeroProps) {
  const router = useRouter();
  const decimals = showDecimals ? undefined : 0;
  const amount = formatMoney(spend.spent, spend.currency, { locale, sign: 'none', decimals });
  const days = spend.series.length;
  const labels = React.useMemo(() => [{ index: 0, text: '1' }, { index: Math.max(days - 1, 0), text: String(days) }], [days]);

  let budgetLine: string | null = null;
  let ratio = 0;
  let marker: number | undefined;
  if (budget) {
    const money = (minor: number) => formatMoney(minor, budget.budget.currency, { locale, decimals: 0 });
    budgetLine =
      budget.remaining < 0
        ? `${money(-budget.remaining)} over`
        : `${money(budget.remaining)} left · ${money(perDayLeft(budget.remaining, budget.period, todayKey))}/day`;
    ratio = budget.budget.amount > 0 ? budget.spent / budget.budget.amount : 0;
    marker = paceMarker(budget.period, todayKey);
  }

  return (
    <Pressable
      role="button"
      accessibilityLabel={`Spent this month, ${formatMoneyForSpeech(spend.spent, spend.currency, { sign: 'none' })}`}
      scale={0.98}
      onPress={() => router.navigate('/insights')}
      className="px-4"
    >
      <Card className="rounded-2xl px-4 pb-4 pt-4">
        <Text variant="footnote" tone="secondary">
          Spent this month
        </Text>
        <View className="flex-row items-center justify-between gap-3">
          <View className="shrink">
            <Amount value={amount} variant="hero" />
          </View>
          {spend.deltaPercent !== null && spend.deltaPercent !== 0 ? <DeltaPill percent={spend.deltaPercent} previousMonth={previousMonth} /> : null}
        </View>
        <View pointerEvents="none" style={{ marginTop: -LANE_TRIM, marginHorizontal: -4, minHeight: 30 + CHART_HEIGHT + 24 }}>
          <PaceChart
            data={spend.series}
            currency={spend.currency}
            locale={locale}
            selectedIndex={null}
            onSelect={noop}
            labels={labels}
            axis="none"
            height={CHART_HEIGHT}
            accessibilityLabel={`Cumulative spending this month against ${previousMonth}`}
          />
        </View>
        {budgetLine ? (
          <View className="mt-1 gap-2">
            <ProgressBar value={ratio} marker={marker} accessibilityLabel={budgetLine} />
            <Text variant="footnote" tone="secondary" numeric numberOfLines={1}>
              {budgetLine}
            </Text>
          </View>
        ) : null}
      </Card>
    </Pressable>
  );
}

export { SpendHero };
