import * as React from 'react';
import { FlatList, Modal, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppIcon } from '@studio/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { CURRENCIES, type CurrencyInfo } from '@studio/money';
import { haptic , useTokens } from '@studio/theme';

type CurrencyPickerProps = {
  visible: boolean;
  selected: string;
  onSelect: (code: string) => void;
  onClose: () => void;
};

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

function matches(currency: CurrencyInfo, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q === '') return true;
  return currency.code.toLowerCase().includes(q) || currency.name[0].toLowerCase().includes(q) || currency.symbol.toLowerCase().includes(q);
}

function CurrencyPicker({ visible, selected, onSelect, onClose }: CurrencyPickerProps) {
  const { colors } = useTokens();
  const [query, setQuery] = React.useState('');
  const data = React.useMemo(() => CURRENCIES.filter((c) => matches(c, query)), [query]);
  const close = () => {
    setQuery('');
    onClose();
  };
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" transparent={false} onRequestClose={close}>
      <SafeAreaProvider>
        <View className="flex-1 bg-bg">
          <View className="h-14 flex-row items-center justify-between px-4">
            <View className="w-16" />
            <Text variant="headline" accessibilityRole="header">
              Currency
            </Text>
            <View className="w-16 items-end">
              <Button variant="barPrimary" size="sm" onPress={close}>
                Done
              </Button>
            </View>
          </View>
          <View className="px-4 pb-2">
            <Input
              value={query}
              onChangeText={setQuery}
              placeholder="Search"
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
              returnKeyType="search"
              accessibilityLabel="Search currencies"
            />
          </View>
          <FlatList
            data={data}
            keyExtractor={(item) => item.code}
            keyboardShouldPersistTaps="handled"
            contentContainerClassName="pb-8"
            renderItem={({ item }) => (
              <Pressable
                role="button"
                scale={1}
                accessibilityLabel={`${item.code}, ${capitalize(item.name[0])}`}
                onPress={() => {
                  haptic('selection');
                  onSelect(item.code);
                  close();
                }}
                className="min-h-[52px] flex-row items-center px-4 active:bg-fill"
              >
                <Text variant="body" tone="secondary" numeric className="w-14">
                  {item.symbol}
                </Text>
                <View className="flex-1">
                  <Text variant="body" numberOfLines={1}>
                    {capitalize(item.name[0])}
                  </Text>
                  <Text variant="footnote" tone="secondary">
                    {item.code}
                  </Text>
                </View>
                {item.code === selected ? <AppIcon name="checkmark" size={16} color={colors.accent} /> : null}
                <View
                  pointerEvents="none"
                  style={{ left: 72, height: StyleSheet.hairlineWidth, backgroundColor: colors.separator }}
                  className="absolute bottom-0 right-0"
                />
              </Pressable>
            )}
          />
        </View>
      </SafeAreaProvider>
    </Modal>
  );
}

export { CurrencyPicker };
export type { CurrencyPickerProps };
