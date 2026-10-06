import * as React from 'react';
import { View } from 'react-native';

import { Pressable , Text } from '@studio/ui';
import { useTokens } from '@studio/theme';

import { tagColorKey, tagPillColors } from './model';

type TagPillProps = {
  name: string;
  color: string;
  /** `sm` for rows and under the memo, `md` for pickers. */
  size?: 'sm' | 'md';
  selected?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
};

/** Coloured tag pill: a dot and the name on a soft tint; `selected` adds a ring. */
function TagPill({ name, color, size = 'sm', selected = false, onPress, accessibilityLabel }: TagPillProps) {
  const { category, colors } = useTokens();
  const hex = category[tagColorKey(color)];
  const pill = tagPillColors(hex);
  const height = size === 'sm' ? 24 : 32;
  const body = (
    <View
      style={{
        height: height,
        borderRadius: height / 2,
        paddingHorizontal: size === 'sm' ? 9 : 13,
        backgroundColor: selected ? pill.bg : size === 'sm' ? pill.bg : colors.fill,
        borderWidth: 1,
        borderColor: selected ? pill.ring : 'transparent',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        alignSelf: 'flex-start',
      }}
    >
      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: hex }} />
      <Text variant={size === 'sm' ? 'caption' : 'callout'} numberOfLines={1} style={{ color: size === 'sm' || selected ? pill.fg : colors.text }}>
        {name}
      </Text>
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable
      role="button"
      accessibilityLabel={accessibilityLabel ?? name}
      accessibilityState={{ selected }}
      haptic="selection"
      popWhen={selected}
      hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
      onPress={onPress}
      style={{ alignSelf: 'flex-start' }}
    >
      {body}
    </Pressable>
  );
}

/** A wrapped row of small pills. */
function TagPills({ tags, onPressTag }: { tags: readonly { id: string; name: string; color: string }[]; onPressTag?: (id: string) => void }) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {tags.map((tag) => (
        <TagPill key={tag.id} name={tag.name} color={tag.color} onPress={onPressTag ? () => onPressTag(tag.id) : undefined} />
      ))}
    </View>
  );
}

export { TagPill, TagPills };
