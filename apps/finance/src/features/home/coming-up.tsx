import { useRouter } from 'expo-router';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';

import { IconTile , Card , Pressable , Text } from '@studio/ui';
import { useBudgets, useCategories, useUpcoming } from '@/data/hooks';
import { dayLabel, diffDays } from '@studio/dates';
import { formatMoney } from '@studio/money';
import { withAlpha, type CategoryColorKey } from '@studio/theme';
import { useTokens } from '@studio/theme';

import { dueIn, frequencyLabel, percentUsed } from './curve';
import { HomeSectionHeader } from './section-header';
import { ProgressRing } from './progress-ring';

const WINDOW_DAYS = 45;

type ComingUpProps = { todayKey: string; locale?: string; showDecimals: boolean };

function Row({ separator, onPress, label, children }: { separator?: boolean; onPress: () => void; label: string; children: React.ReactNode }) {
  const { colors } = useTokens();
  return (
    <Pressable
      role="button"
      accessibilityLabel={label}
      scale={0.98}
      onPress={onPress}
      className="min-h-[62px] flex-row items-center gap-3 px-4 py-3"
      style={separator ? { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: colors.separator } : null}
    >
      {children}
    </Pressable>
  );
}

/** One card: the next bill and the overall budget. Rows without data are hidden; so is the card when both are. */
function ComingUp({ todayKey, locale, showDecimals }: ComingUpProps) {
  const router = useRouter();
  const { colors } = useTokens();
  const occurrences = useUpcoming(WINDOW_DAYS);
  const categories = useCategories();
  const budgets = useBudgets();
  const category = React.useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const next = occurrences.find((o) => o.rule.kind !== 'transfer') ?? occurrences[0];
  const budget = budgets.find((b) => b.budget.scope === 'all' && b.budget.period === 'monthly') ?? budgets.find((b) => b.budget.scope === 'all') ?? budgets[0];
  if (!next && !budget) return null;

  const decimals = showDecimals ? undefined : 0;
  let bill: React.ReactNode = null;
  if (next) {
    const { rule, dueDate } = next;
    const cat = rule.categoryId ? category.get(rule.categoryId) : undefined;
    const days = diffDays(todayKey, dueDate);
    const when = days <= 1 ? dueIn(days) : `${dayLabel(dueDate, todayKey)} · ${dueIn(days)}`;
    const title = rule.title || cat?.name || 'Recurring';
    const amount = formatMoney(rule.amount, rule.currency, { locale, sign: rule.kind === 'income' ? 'plus' : 'none', decimals });
    bill = (
      <Row onPress={() => router.push({ pathname: '/recurring/[id]', params: { id: rule.id } })} label={`${title}, ${when}, ${amount}`}>
        <IconTile icon={cat?.icon ?? 'arrow.triangle.2.circlepath'} color={(cat?.color ?? 'gray') as CategoryColorKey} size={36} />
        <View className="min-w-0 flex-1">
          <Text variant="callout" numberOfLines={1} className="font-medium tracking-[-0.2px]">
            {title}
          </Text>
          <Text variant="footnote" tone="secondary" numberOfLines={1} className="mt-[3px]">
            {when}
          </Text>
        </View>
        <View className="items-end">
          <Text variant="callout" numeric className="font-semibold tracking-[-0.2px]">
            {amount}
          </Text>
          <Text variant="caption" tone="tertiary" className="mt-[3px]">
            {frequencyLabel(rule.frequency, rule.interval)}
          </Text>
        </View>
      </Row>
    );
  }

  let budgetRow: React.ReactNode = null;
  if (budget) {
    const { budget: b, spent, remaining } = budget;
    const money = (minor: number) => formatMoney(minor, b.currency, { locale, decimals: 0 });
    const ratio = b.amount > 0 ? spent / b.amount : 0;
    const percent = percentUsed(spent, b.amount);
    const ringColor = ratio > 1 ? colors.expense : ratio >= 0.9 ? colors.warning : colors.accent;
    const sub = remaining < 0 ? `${money(-remaining)} over ${money(b.amount)}` : `${money(remaining)} left of ${money(b.amount)}`;
    const name = b.scope === 'all' ? 'Budgets' : (b.categoryIds.map((id) => category.get(id)?.name).find(Boolean) ?? 'Budget');
    budgetRow = (
      <Row
        separator={!!bill}
        onPress={() => (b.scope === 'all' && budgets.length > 1 ? router.navigate('/budgets') : router.push({ pathname: '/budget/[id]', params: { id: b.id } }))}
        label={`${name}, ${sub}, ${percent} percent used`}
      >
        <ProgressRing value={ratio} color={ringColor} track={withAlpha(colors.text, 0.08)} />
        <View className="min-w-0 flex-1">
          <Text variant="callout" numberOfLines={1} className="font-medium tracking-[-0.2px]">
            {name}
          </Text>
          <Text variant="footnote" tone="secondary" numberOfLines={1} numeric className="mt-[3px]">
            {sub}
          </Text>
        </View>
        <View className="items-end">
          <Text variant="callout" numeric className="font-semibold tracking-[-0.2px]" style={ratio > 1 ? { color: colors.expense } : undefined}>
            {`${percent}%`}
          </Text>
          <Text variant="caption" tone="tertiary" className="mt-[3px]">
            used
          </Text>
        </View>
      </Row>
    );
  }

  return (
    <View>
      <HomeSectionHeader title="Coming up" actionLabel="All" onAction={() => router.push('/recurring')} />
      <Card className="rounded-[20px] p-0">
        {bill}
        {budgetRow}
      </Card>
    </View>
  );
}

export { ComingUp };
