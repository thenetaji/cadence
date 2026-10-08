import * as React from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  AmountReadout,
  CurrencyPicker,
  ListGroup,
  ListRow,
  Button,
  Input,
  Text,
} from "@studio/ui";
import { Keypad, type KeypadKey } from "@studio/ui";
import { useActions } from "@/data/actions";
import { defaultCurrencyCode } from "@/lib/default-currency";
import {
  createKeypadState,
  deriveKeypad,
  keypadReducer,
  type KeypadKey as ReducerKey,
  type KeypadState,
} from "@studio/money";
import { currencySymbol, minorDigits } from "@studio/money";
import { haptic, useTokens } from "@studio/theme";

type Action =
  | { type: "key"; key: ReducerKey }
  | { type: "reset"; digits: number };

function reduce(state: KeypadState, action: Action): KeypadState {
  if (action.type === "reset") return createKeypadState(action.digits);
  return keypadReducer(state, action.key);
}

const toReducerKey = (key: KeypadKey): ReducerKey =>
  key === "backspace" ? "back" : key;

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const { colors } = useTokens();
  const actions = useActions();
  const [currency, setCurrency] = React.useState(defaultCurrencyCode);
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [name, setName] = React.useState("Cash");
  const [editingName, setEditingName] = React.useState(false);
  const [keypad, dispatch] = React.useReducer(reduce, undefined, () =>
    createKeypadState(minorDigits(defaultCurrencyCode())),
  );
  const view = deriveKeypad(keypad);
  const digits = minorDigits(currency);
  const canStart = name.trim().length > 0;

  const selectCurrency = (code: string) => {
    setCurrency(code);
    dispatch({ type: "reset", digits: minorDigits(code) });
  };

  const start = () => {
    if (!canStart) return;
    haptic("success");
    const account = actions.accounts.create({
      name,
      type: "cash",
      currency,
      openingBalance: view.total,
      color: "blue",
      isDefault: true,
    });
    actions.settings.set("display_currency", currency);
    actions.settings.set("default_account_id", account.id);
    actions.settings.set("onboarding_done", true);
  };

  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top }}>
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="gap-6 pb-6 pt-6"
        scrollEnabled={editingName}
      >
        <Text variant="largeTitle" accessibilityRole="header" className="px-6">
          Set up
        </Text>
        <View className="items-center gap-1">
          <Text variant="footnote" tone="secondary">
            Opening balance
          </Text>
          <AmountReadout
            symbol={currencySymbol(currency)}
            value={view.display}
            expression={view.expression || undefined}
          />
        </View>
        <ListGroup>
          <ListRow
            label="Currency"
            value={`${currencySymbol(currency)} ${currency}`}
            chevron
            onPress={() => setPickerOpen(true)}
          />
          <ListRow
            label="Account"
            trailing={
              <Input
                variant="inline"
                value={name}
                onChangeText={setName}
                onFocus={() => setEditingName(true)}
                onBlur={() => setEditingName(false)}
                placeholder="Name"
                returnKeyType="done"
                autoCapitalize="words"
                autoCorrect={false}
                maxLength={40}
                selectionColor={colors.textTertiary}
                cursorColor={colors.textTertiary}
                accessibilityLabel="Account name"
                className="ml-3 h-8 min-h-0 w-44 rounded-[8px] bg-fill px-3 py-0 text-right"
              />
            }
          />
        </ListGroup>
      </ScrollView>
      <View className="px-4 pb-3">
        <Button size="lg" disabled={!canStart} onPress={start}>
          Start
        </Button>
      </View>
      {editingName ? null : (
        <View className="bg-bg" style={{ paddingBottom: insets.bottom }}>
          <Keypad
            showDecimal={digits > 0}
            onKey={(key) => dispatch({ type: "key", key: toReducerKey(key) })}
            onLongBackspace={() => dispatch({ type: "key", key: "clear" })}
          />
        </View>
      )}
      <CurrencyPicker
        visible={pickerOpen}
        selected={currency}
        onSelect={selectCurrency}
        onClose={() => setPickerOpen(false)}
      />
    </View>
  );
}
