import { useRouter } from 'expo-router';
import * as React from 'react';
import { ScrollView } from 'react-native';

import { SectionHeader } from '@/components/app/section-header';
import { IconTile } from '@/components/app/icon-tile';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { useCategories, useFrequentTitles } from '@/data/hooks';
import { formatMoney } from '@/lib/money';
import type { CategoryColorKey } from '@/theme/tokens';

const LIMIT = 6;

type QuickAddProps = { displayCurrency: string; locale?: string; showDecimals: boolean };

/** One-tap repeats from title memory: chip opens the add sheet prefilled, so logging is chip then Save. */
function QuickAdd({ displayCurrency, locale, showDecimals }: QuickAddProps) {
  const router = useRouter();
  const titles = useFrequentTitles(LIMIT);
  const categories = useCategories();
  const byId = React.useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  if (titles.length === 0) return null;

  return (
    <>
      <SectionHeader title="Quick add" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-4">
        {titles.map((row) => {
          const category = row.categoryId ? byId.get(row.categoryId) : undefined;
          const amount =
            row.lastAmount !== null
              ? formatMoney(row.lastAmount, row.lastCurrency ?? displayCurrency, { locale, decimals: showDecimals ? undefined : 0 })
              : null;
          const params: Record<string, string> = { kind: 'expense', title: row.title };
          if (category) params.categoryId = category.id;
          if (row.accountId) params.accountId = row.accountId;
          if (row.lastAmount !== null) {
            params.amount = String(row.lastAmount);
            if (row.lastCurrency) params.currency = row.lastCurrency;
          }
          return (
            <Pressable
              key={row.titleNorm}
              role="button"
              accessibilityLabel={amount ? `${row.title}, ${amount}` : row.title}
              haptic="light"
              scale={0.96}
              onPress={() => router.push({ pathname: '/transaction/new', params })}
              className="h-11 flex-row items-center gap-2 rounded-full bg-surface pl-3 pr-3.5"
            >
              <IconTile icon={category?.icon ?? 'tag.fill'} color={(category?.color ?? 'gray') as CategoryColorKey} size={24} radius={12} />
              <Text variant="callout" numberOfLines={1} className="max-w-[140px]">
                {row.title}
              </Text>
              {amount ? (
                <Text variant="callout" tone="secondary" numeric numberOfLines={1}>
                  {amount}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </>
  );
}

export { QuickAdd };
