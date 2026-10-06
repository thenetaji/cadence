import * as React from 'react';
import { View } from 'react-native';

import { IconTile } from '@/components/app/icon-tile';
import { Input } from '@/components/ui/input';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { conceptFor, conceptLabel } from '@/icons/registry';
import { tileRadius } from '@/icons/tile-styles';
import type { CategoryColorKey } from '@/theme/tokens';
import { useTokens } from '@/theme/use-tokens';

import { iconSections } from './icons';

const SIZE = 46;
const RING = 3;

type IconGridProps = { value: string; color: CategoryColorKey; onChange: (icon: string) => void };

/** Searchable, themed grid of every curated icon, drawn in the user's icon style and tile treatment. */
function IconGrid({ value, color, onChange }: IconGridProps) {
  const { colors } = useTokens();
  const [query, setQuery] = React.useState('');
  const [initial] = React.useState(value);
  const sections = React.useMemo(() => iconSections(query, initial), [query, initial]);
  const selected = conceptFor(value);
  return (
    <View className="gap-3">
      <Input
        value={query}
        onChangeText={setQuery}
        placeholder="Search icons"
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        accessibilityLabel="Search icons"
      />
      {sections.length === 0 ? (
        <Text variant="callout" tone="secondary" className="py-6 text-center">
          No matches
        </Text>
      ) : (
        sections.map((section) => (
          <View key={section.title}>
            <Text variant="footnote" tone="secondary" className="pb-2 pt-1" accessibilityRole="header">
              {section.title}
            </Text>
            <View className="-mx-1 flex-row flex-wrap">
              {section.ids.map((id) => {
                const on = id === selected;
                return (
                  <View key={id} className="w-1/5 items-center pb-2">
                    <Pressable
                      role="button"
                      accessibilityLabel={conceptLabel(id)}
                      accessibilityState={{ selected: on }}
                      haptic="selection"
                      onPress={() => onChange(id)}
                      className="items-center justify-center"
                      style={{ padding: RING, borderRadius: tileRadius(SIZE) + RING, borderWidth: 2, borderColor: on ? colors.accent : 'transparent' }}
                    >
                      <IconTile icon={id} color={color} size={SIZE} />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </View>
        ))
      )}
    </View>
  );
}

export { IconGrid };
