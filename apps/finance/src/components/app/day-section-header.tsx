import { View } from 'react-native';

import { Text } from '@/components/ui/text';

type DaySectionHeaderProps = { label: string; total?: string };

function DaySectionHeader({ label, total }: DaySectionHeaderProps) {
  return (
    <View accessibilityRole="header" className="flex-row items-baseline justify-between bg-bg px-4 pb-2 pt-4">
      <Text variant="footnote" tone="secondary">
        {label}
      </Text>
      {total ? (
        <Text variant="footnote" tone="secondary" numeric>
          {total}
        </Text>
      ) : null}
    </View>
  );
}

export { DaySectionHeader };
export type { DaySectionHeaderProps };
