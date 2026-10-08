import * as React from "react";
import { ActionSheetIOS, Platform } from "react-native";

import { OptionPicker } from "@studio/ui";
import { FormChip } from "@/features/transaction-form/chips";
import { useTokens } from "@studio/theme";

type MenuOption = { value: string; label: string };

type MenuChipProps = {
  label: string;
  icon?: string;
  title: string;
  options: readonly MenuOption[];
  selected: string | null;
  onSelect: (value: string) => void;
  highlight?: boolean;
  accessibilityLabel?: string;
  shrink?: boolean;
};

/** Chip that opens a native action sheet on iOS and the shared option picker elsewhere. */
function MenuChip({
  label,
  icon,
  title,
  options,
  selected,
  onSelect,
  highlight = false,
  accessibilityLabel,
  shrink,
}: MenuChipProps) {
  const { scheme } = useTokens();
  const [open, setOpen] = React.useState(false);
  const present = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title,
          options: [...options.map((o) => o.label), "Cancel"],
          cancelButtonIndex: options.length,
          userInterfaceStyle: scheme,
        },
        (index) => {
          const option = options[index];
          if (option) onSelect(option.value);
        },
      );
      return;
    }
    setOpen(true);
  };
  return (
    <>
      <FormChip
        label={label}
        icon={icon}
        selected={highlight}
        onPress={present}
        accessibilityLabel={accessibilityLabel}
        shrink={shrink}
      />
      {Platform.OS === "ios" ? null : (
        <OptionPicker
          visible={open}
          title={title}
          options={options}
          selected={selected}
          onSelect={(v) => v !== null && onSelect(v)}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

export { MenuChip };
export type { MenuOption };
