import { useRouter } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';

import { IconTile } from '@/components/app/icon-tile';
import { SectionHeader } from '@/components/app/section-header';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import type { Insights } from '@/data/hooks';
import { formatMoney } from '@/lib/money';
import type { CategoryColorKey } from '@/theme/tokens';
import { useTokens } from '@/theme/use-tokens';

const BAR_CATEGORIES = 5;
const ROWS = 4;

type TopCategoriesProps = { insights: Insights; locale?: string; showDecimals: boolean };

/** Stacked bar of the month's categories (top 5 and Other) and the four largest as rows. */
function TopCategories({ insights, locale, showDecimals }: TopCategoriesProps) {
  const router = useRouter();
  const { category: palette, colors } = useTokens();
  const rows = insights.categories;
  const segments = React.useMemo(() => {
    const top = rows.slice(0, BAR_CATEGORIES).map((r) => ({ key: r.categoryId ?? 'none', amount: r.amount, color: palette[(r.category?.color ?? 'gray') as CategoryColorKey] }));
    const other = rows.slice(BAR_CATEGORIES).reduce((sum, r) => sum + r.amount, 0);
    return other > 0 ? [...top, { key: 'other', amount: other, color: palette.gray }] : top;
  }, [rows, palette]);
  if (rows.length === 0) return null;
  const decimals = showDecimals ? undefined : 0;

  return (
    <>
      <SectionHeader title="Top categories" actionLabel="All" onAction={() => router.navigate('/insights')} />
      <Card className="mx-4 gap-4 rounded-2xl px-4 py-4">
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" className="h-[10px] flex-row overflow-hidden rounded-full" style={{ gap: 2, backgroundColor: colors.fill }}>
          {segments.map((s) => (
            <View key={s.key} style={{ flex: s.amount, backgroundColor: s.color }} />
          ))}
        </View>
        <View className="gap-3">
          {rows.slice(0, ROWS).map((r) => (
            <View
              key={r.categoryId ?? 'none'}
              accessible
              accessibilityLabel={`${r.category?.name ?? 'Uncategorised'}, ${formatMoney(r.amount, insights.currency, { locale, sign: 'none', decimals })}, ${r.percent} percent`}
              className="flex-row items-center gap-3"
            >
              <IconTile icon={r.category?.icon ?? 'tag.fill'} color={(r.category?.color ?? 'gray') as CategoryColorKey} size={28} radius={8} />
              <Text variant="body" numberOfLines={1} className="flex-1">
                {r.category?.name ?? 'Uncategorised'}
              </Text>
              <Text variant="body" numeric className="font-medium">
                {formatMoney(r.amount, insights.currency, { locale, sign: 'none', decimals })}
              </Text>
              <Text variant="footnote" tone="secondary" numeric className="w-9 text-right">
                {`${r.percent}%`}
              </Text>
            </View>
          ))}
        </View>
      </Card>
    </>
  );
}

export { TopCategories };
