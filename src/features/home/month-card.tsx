import { useRouter } from 'expo-router';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';

import { Amount } from '@/components/app/amount';
import { SymbolIcon } from '@/components/app/symbol';
import { ProgressBar } from '@/components/app/progress-bar';
import { Card } from '@/components/ui/card';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import type { BudgetSpent, PeriodSummary } from '@/data/hooks';
import { diffDays } from '@/lib/dates';
import { formatMoney, formatMoneyForSpeech } from '@/lib/money';
import { pressScale } from '@/theme/tokens';
import { useTokens } from '@/theme/use-tokens';

type MonthCardProps = {
  summary: PeriodSummary;
  budget?: BudgetSpent;
  todayKey: string;
  locale?: string;
  showDecimals: boolean;
};

/** Spent / Earned for the month and, when an all-spending budget exists, its progress line. */
function MonthCard({ summary, budget, todayKey, locale, showDecimals }: MonthCardProps) {
  const router = useRouter();
  const { colors } = useTokens();
  const decimals = showDecimals ? undefined : 0;
  const spent = formatMoney(summary.spent, summary.currency, { locale, sign: 'none', decimals });
  const earned = formatMoney(summary.earned, summary.currency, { locale, sign: 'none', decimals });

  let budgetLine: string | null = null;
  let ratio = 0;
  if (budget) {
    const left = Math.max(diffDays(todayKey, budget.period.to) + 1, 0);
    const money = (minor: number) => formatMoney(minor, budget.budget.currency, { locale, decimals });
    budgetLine = `${money(budget.spent)} of ${money(budget.budget.amount)} · ${left} ${left === 1 ? 'day' : 'days'} left`;
    ratio = budget.budget.amount > 0 ? budget.spent / budget.budget.amount : 0;
  }

  return (
    <Pressable role="button" scale={pressScale.card} onPress={() => router.navigate('/insights')} className="px-4">
      <Card className="gap-3 px-0 py-4">
        <View pointerEvents="none" className="absolute right-4 top-4">
          <SymbolIcon name="chevron.right" size={13} color={colors.textTertiary} weight="semibold" />
        </View>
        <View className="flex-row">
          <View className="flex-1 px-4" accessible accessibilityLabel={`Spent, ${formatMoneyForSpeech(summary.spent, summary.currency, { sign: 'none' })}`}>
            <Text variant="footnote" tone="secondary">
              Spent
            </Text>
            <Amount value={spent} variant="title" />
          </View>
          <View style={{ width: StyleSheet.hairlineWidth, backgroundColor: colors.separator }} />
          <View className="flex-1 px-4" accessible accessibilityLabel={`Earned, ${formatMoneyForSpeech(summary.earned, summary.currency, { sign: 'none' })}`}>
            <Text variant="footnote" tone="secondary">
              Earned
            </Text>
            <Amount value={earned} variant="title" tone="income" />
          </View>
        </View>
        {budgetLine ? (
          <View className="gap-2 px-4">
            <ProgressBar value={ratio} accessibilityLabel={budgetLine} />
            <Text variant="footnote" tone="secondary" numeric numberOfLines={1}>
              {budgetLine}
            </Text>
          </View>
        ) : null}
      </Card>
    </Pressable>
  );
}

export { MonthCard };
