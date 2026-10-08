import { Modal, ScrollView, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ListGroup, ListRow } from "./list-group";
import { AppIcon } from "@studio/icons";
import { Button } from "../ui/button";
import { Text } from "../ui/text";
import { haptic, useTokens } from "@studio/theme";

type Option<T extends string | number | null> = { value: T; label: string };

type OptionPickerProps<T extends string | number | null> = {
  visible: boolean;
  title: string;
  options: readonly Option<T>[];
  selected: T;
  onSelect: (value: T) => void;
  onClose: () => void;
};

function OptionPicker<T extends string | number | null>({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
}: OptionPickerProps<T>) {
  const { colors } = useTokens();
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaProvider>
        <View className="flex-1 bg-bg">
          <View className="h-14 flex-row items-center justify-between px-4">
            <View className="w-16" />
            <Text variant="headline" accessibilityRole="header">
              {title}
            </Text>
            <View className="w-16 items-end">
              <Button variant="barPrimary" size="sm" onPress={onClose}>
                Done
              </Button>
            </View>
          </View>
          <ScrollView contentContainerClassName="pb-8 pt-2">
            <ListGroup>
              {options.map((option) => (
                <ListRow
                  key={String(option.value)}
                  label={option.label}
                  trailing={
                    option.value === selected ? (
                      <AppIcon
                        name="checkmark"
                        size={16}
                        color={colors.accent}
                      />
                    ) : undefined
                  }
                  onPress={() => {
                    haptic("selection");
                    onSelect(option.value);
                    onClose();
                  }}
                />
              ))}
            </ListGroup>
          </ScrollView>
        </View>
      </SafeAreaProvider>
    </Modal>
  );
}

export { OptionPicker };
export type { Option, OptionPickerProps };
