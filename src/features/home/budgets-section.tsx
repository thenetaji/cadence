import { useRouter } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';

import { ProgressBar } from '@/components/app/progress-bar';
import { SectionHeader } from '@/components/app/section-header';
import { Card } from '@/components/ui/card';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { useBudgets, useCategories } from '@/data/hooks';
import { toBudgetView } from '@/features/budgets/model';
import { useTokens } from '@/theme/use-tokens';

const LIMIT = 3;

type BudgetsSectionProps = { todayKey: string; locale?: string; showDecimals: boolean };

/** Up to three budgets as compact rows; nothing when none exist. */
function BudgetsSection({ todayKey, locale, showDecimals }: BudgetsSectionProps) {
  const router = useRouter();
  const { category: palette } = useTokens();
  const progress = useBudgets();
  const categories = useCategories();
  const categoryMap = React.useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const views = React.useMemo(
    () => progress.slice(0, LIMIT).map((p) => toBudgetView(p, { locale, showDecimals, todayKey, categories: categoryMap })),
    [progress, locale, showDecimals, todayKey, categoryMap],
  );
  if (views.length === 0) return null;

  return (
    <>
      <SectionHeader title="Budgets" actionLabel="All" onAction={() => router.navigate('/budgets')} />
      <Card className="mx-4 rounded-2xl p-0">
        {views.map((view, index) => (
          <Pressable
            key={view.id}
            role="button"
            accessibilityLabel={view.accessibilityLabel}
            scale={0.98}
            onPress={() => router.push({ pathname: '/budget/[id]', params: { id: view.id } })}
            className="gap-2 px-4 py-3"
          >
            <View className="flex-row items-baseline justify-between gap-3">
              <Text variant="body" numberOfLines={1} className="shrink font-medium">
                {view.name}
              </Text>
              <Text variant="footnote" tone="secondary" numeric numberOfLines={1}>
                {view.progressText}
              </Text>
            </View>
            <ProgressBar value={view.ratio} marker={view.marker} color={view.scope === 'all' ? undefined : palette[view.color]} />
          </Pressable>
        ))}
      </Card>
    </>
  );
}

export { BudgetsSection };
