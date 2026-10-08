import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Keypad } from "@studio/ui";

import type { AmountEntry } from "./use-amount-entry";

type AmountKeypadProps = {
  entry: AmountEntry;
  digits: number;
  /** Equals acts as Save when nothing is pending. */
  onSave?: () => void;
};

/** Keypad bound to an amount entry, sitting above the home indicator. */
function AmountKeypad({ entry, digits, onSave }: AmountKeypadProps) {
  const insets = useSafeAreaInsets();
  return (
    <View className="bg-bg" style={{ paddingBottom: insets.bottom }}>
      <Keypad
        keyHeight={52}
        showDecimal={digits > 0}
        saveMode={!!onSave && entry.view.equalsIsSave}
        onKey={(key) =>
          key === "=" && onSave && entry.view.equalsIsSave
            ? onSave()
            : entry.press(key)
        }
        onLongBackspace={entry.clear}
      />
    </View>
  );
}

export { AmountKeypad };
