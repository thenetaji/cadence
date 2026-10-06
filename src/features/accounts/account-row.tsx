import * as React from 'react';
import { StyleSheet, View } from 'react-native';

import { IconTile } from '@/components/app/icon-tile';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { pressScale } from '@/theme/tokens';
import { useTokens } from '@/theme/use-tokens';

import type { AccountView } from './model';

export const ACCOUNT_ROW_HEIGHT = 68;

type AccountRowProps = {
  view: AccountView;
  separator?: boolean;
  onPress: () => void;
  /** Replaces the balance column (the drag handle in edit mode). */
  trailing?: React.ReactNode;
};

/** Icon tile on the account colour, name and type, balance with its converted value below. */
function AccountRow({ view, separator = true, onPress, trailing }: AccountRowProps) {
  const { colors } = useTokens();
  return (
    <Pressable
      role="button"
      accessibilityLabel={view.accessibilityLabel}
      scale={pressScale.row}
      onPress={onPress}
      className="flex-row items-center bg-surface px-4"
      style={{ height: ACCOUNT_ROW_HEIGHT }}
    >
      <IconTile icon={view.icon} color={view.color} size={40} />
      <View className="ml-3 mr-3 flex-1">
        <Text variant="body" numberOfLines={1}>
          {view.name}
        </Text>
        <Text variant="subhead" tone="secondary" numberOfLines={1}>
          {view.subtitle}
        </Text>
      </View>
      {trailing ?? (
        <View className="items-end">
          <Text variant="body" numeric numberOfLines={1} tone={view.negative ? 'expense' : 'default'} className="font-medium">
            {view.balance}
          </Text>
          {view.converted ? (
            <Text variant="footnote" tone="tertiary" numeric numberOfLines={1}>
              {view.converted}
            </Text>
          ) : null}
        </View>
      )}
      {separator ? (
        <View pointerEvents="none" style={{ left: 68, height: StyleSheet.hairlineWidth, backgroundColor: colors.separator }} className="absolute bottom-0 right-0" />
      ) : null}
    </Pressable>
  );
}

export { AccountRow };
