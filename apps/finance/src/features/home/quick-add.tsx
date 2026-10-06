import { useRouter } from 'expo-router';
import * as React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { IconTile } from '@/components/app/icon-tile';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { useCategories, useQuickAdd } from '@/data/hooks';
import { useTokens } from '@studio/theme';
import type { CategoryColorKey } from '@studio/theme';

const LIMIT = 8;

/** Eyebrow plus chips for the most frequent title + category pairs; a tap opens the add sheet with the keypad ready. */
function QuickAdd() {
  const router = useRouter();
  const { colors } = useTokens();
  const entries = useQuickAdd(LIMIT);
  const categories = useCategories();
  const byId = React.useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  if (entries.length === 0) return null;

  return (
    <View>
      <Text variant="caption" tone="tertiary" className="mb-2.5 px-0.5 font-semibold uppercase tracking-[0.9px]">
        Quick add
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4" contentContainerClassName="gap-2 px-4">
        {entries.map((entry) => {
          const category = entry.categoryId ? byId.get(entry.categoryId) : undefined;
          const params: Record<string, string> = { title: entry.title, accountId: entry.accountId };
          if (entry.kind === 'income') params.kind = 'income';
          if (entry.categoryId) params.categoryId = entry.categoryId;
          return (
            <Pressable
              key={`${entry.title}:${entry.categoryId ?? ''}`}
              role="button"
              accessibilityLabel={`Add ${entry.title}`}
              haptic="light"
              scale={0.94}
              onPress={() => router.push({ pathname: '/transaction/new', params })}
              className="h-10 flex-row items-center gap-2 rounded-full bg-surface pl-2 pr-[15px]"
              style={{ borderWidth: StyleSheet.hairlineWidth * 2, borderColor: colors.border }}
            >
              <IconTile icon={category?.icon ?? 'tag.fill'} color={(category?.color ?? 'gray') as CategoryColorKey} size={26} />
              <Text variant="footnote" numberOfLines={1} className="max-w-[150px] text-[14px] font-semibold tracking-[-0.1px]">
                {entry.title}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export { QuickAdd };
