import { Modal, ScrollView, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Button , Text } from '@studio/ui';
import type { CategoryRow } from '@/db/schema';

import { CategoryGrid } from './category-grid';

type CategoryPickerProps = {
  visible: boolean;
  categories: readonly CategoryRow[];
  selected: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
};

/** Single-choice category sheet for forms that have no draft store of their own. */
function CategoryPicker({ visible, categories, selected, onSelect, onClose }: CategoryPickerProps) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" transparent={false} onRequestClose={onClose}>
      <SafeAreaProvider>
        <View className="flex-1 bg-bg">
          <View className="h-14 flex-row items-center justify-between px-4">
            <View className="w-16" />
            <Text variant="headline" accessibilityRole="header">
              Category
            </Text>
            <View className="w-16 items-end">
              <Button variant="barSecondary" size="sm" onPress={onClose}>
                Cancel
              </Button>
            </View>
          </View>
          <ScrollView contentContainerClassName="pb-8" showsVerticalScrollIndicator={false}>
            <CategoryGrid
              categories={categories}
              selected={selected ? [selected] : []}
              onToggle={(id) => {
                onSelect(id);
                onClose();
              }}
            />
          </ScrollView>
        </View>
      </SafeAreaProvider>
    </Modal>
  );
}

export { CategoryPicker };
