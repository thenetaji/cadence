import * as React from 'react';
import { StyleSheet, View } from 'react-native';

import { Amount } from '@/components/app/amount';
import { Card } from '@/components/ui/card';
import { Text, type TextTone } from '@/components/ui/text';
import { useTokens } from '@studio/theme';

type SummaryItem = { label: string; value: string; tone?: TextTone };

type SummaryStripProps = { items: readonly SummaryItem[] };

function SummaryStrip({ items }: SummaryStripProps) {
  const { colors } = useTokens();
  return (
    <Card className="flex-row px-0 py-3">
      {items.map((item, index) => (
        <React.Fragment key={item.label}>
          {index > 0 ? <View style={{ width: StyleSheet.hairlineWidth, backgroundColor: colors.separator }} /> : null}
          <View className="flex-1 px-4" accessible accessibilityLabel={`${item.label} ${item.value}`}>
            <Text variant="footnote" tone="secondary">
              {item.label}
            </Text>
            <Amount value={item.value} tone={item.tone} variant="title" animate />
          </View>
        </React.Fragment>
      ))}
    </Card>
  );
}

export { SummaryStrip };
export type { SummaryItem, SummaryStripProps };
