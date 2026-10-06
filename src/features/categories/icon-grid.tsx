import * as React from 'react';
import { View } from 'react-native';

import { SymbolIcon } from '@/components/app/symbol';
import { Input } from '@/components/ui/input';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { withAlpha, type CategoryColorKey } from '@/theme/tokens';
import { useTokens } from '@/theme/use-tokens';

import { filterIcons } from './icons';

const SIZE = 44;

type IconGridProps = { value: string; color: CategoryColorKey; onChange: (icon: string) => void };

/** Searchable grid of curated symbols as 44 pt circles in the chosen colour. */
function IconGrid({ value, color, onChange }: IconGridProps) {
  const { category, isDark } = useTokens();
  const [query, setQuery] = React.useState('');
  const [initial] = React.useState(value);
  const icons = React.useMemo(() => filterIcons(query, initial), [query, initial]);
  const tint = category[color];
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
      {icons.length === 0 ? (
        <Text variant="callout" tone="secondary" className="py-6 text-center">
          No matches
        </Text>
      ) : (
        <View className="-mx-1 flex-row flex-wrap">
          {icons.map((name) => {
            const on = name === value;
            return (
              <View key={name} className="w-1/6 items-center pb-3">
                <Pressable
                  role="button"
                  accessibilityLabel={name.split('.').filter((p) => p !== 'fill').join(' ')}
                  accessibilityState={{ selected: on }}
                  haptic="selection"
                  onPress={() => onChange(name)}
                  className="items-center justify-center rounded-full"
                  style={{ width: SIZE, height: SIZE, backgroundColor: on ? tint : withAlpha(tint, isDark ? 0.22 : 0.15) }}
                >
                  <SymbolIcon name={name} size={20} color={on ? '#FFFFFF' : tint} />
                </Pressable>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

export { IconGrid };
