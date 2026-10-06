import { StyleSheet, View } from 'react-native';

import { Pressable , Text } from '@studio/ui';
import { AppIcon } from '@studio/icons';
import { pressScale , useTokens } from '@studio/theme';

import { Avatar } from './avatar';

type PersonRowLineProps = {
  name: string;
  line: { text: string; tone: 'income' | 'secondary' };
  separator?: boolean;
  onPress?: () => void;
};

/** Avatar, name, and "owes you ₹2,400" (mint) or "you owe ₹800" (neutral). */
export function PersonRowLine({ name, line, separator = true, onPress }: PersonRowLineProps) {
  const { colors } = useTokens();
  return (
    <Pressable
      role="button"
      accessibilityLabel={`${name}, ${line.text}`}
      scale={pressScale.row}
      onPress={onPress}
      className="min-h-[60px] flex-row items-center gap-3 bg-surface px-4 py-2"
    >
      <Avatar name={name} size={40} />
      <View className="min-w-0 flex-1">
        <Text variant="body" numberOfLines={1}>
          {name}
        </Text>
        <Text variant="subhead" tone={line.tone} numeric numberOfLines={1}>
          {line.text}
        </Text>
      </View>
      <AppIcon name="chevron-right" size={13} color={colors.textTertiary} />
      {separator ? (
        <View pointerEvents="none" style={{ left: 68, height: StyleSheet.hairlineWidth, backgroundColor: colors.separator }} className="absolute bottom-0 right-0" />
      ) : null}
    </Pressable>
  );
}
