import { useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import { Platform, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AmountReadout, Button, Text } from "@studio/ui";
import { Keypad, type KeypadKey } from "@studio/ui";
import { useActions } from "@/data/actions";
import { useAccounts, usePersonHistory } from "@/data/hooks";
import { ValidationError } from "@/db/errors";
import { MenuChip } from "@/features/transaction-form/menu-chip";
import { useMoneyContext } from "@/features/transactions/use-money-context";
import {
  createKeypadState,
  deriveKeypad,
  keypadReducer,
  type KeypadState,
} from "@studio/money";
import {
  currencySymbol,
  formatMoney,
  formatMoneyForSpeech,
  minorDigits,
} from "@studio/money";
import { Shimmer } from "@studio/motion";
import { haptic } from "@studio/theme";

import { Avatar } from "./avatar";

type Account = ReturnType<typeof useAccounts>[number];
type History = NonNullable<ReturnType<typeof usePersonHistory>>;

/** Settle up: an amount keypad prefilled with what is outstanding in the chosen account's currency. */
export function SettleSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const history = usePersonHistory(id);
  const accounts = useAccounts();
  const [accountId, setAccountId] = React.useState<string | null>(null);
  if (!history) return <View className="flex-1 bg-bg" />;
  // Default to an account in a currency that is outstanding; the user's order breaks ties.
  const account =
    accounts.find((a) => a.id === accountId) ??
    accounts.find((a) =>
      history.balances.some((b) => b.currency === a.currency),
    ) ??
    accounts[0];
  if (!account) return <View className="flex-1 bg-bg" />;
  const outstanding =
    history.balances.find((b) => b.currency === account.currency)?.amount ?? 0;
  return (
    <SettleBody
      key={account.currency}
      history={history}
      account={account}
      accounts={accounts}
      outstanding={outstanding}
      onAccount={setAccountId}
    />
  );
}

function SettleBody({
  history,
  account,
  accounts,
  outstanding,
  onAccount,
}: {
  history: History;
  account: Account;
  accounts: Account[];
  outstanding: number;
  onAccount: (id: string) => void;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const actions = useActions();
  const money = useMoneyContext();
  const currency = account.currency;
  const digits = minorDigits(currency);
  const maximum = Math.abs(outstanding);
  const [entry, setEntry] = React.useState<KeypadState>(() =>
    createKeypadState(digits, maximum),
  );
  const [done, setDone] = React.useState(false);

  const view = deriveKeypad(entry);
  const amount = view.total;
  const owed = outstanding > 0;
  const invalid = amount <= 0 || amount > maximum;
  const fmt = (minor: number) =>
    formatMoney(minor, currency, {
      locale: money.locale,
      sign: "none",
      ...(minor % 10 ** digits === 0 ? { decimals: 0 } : {}),
    });

  const submit = () => {
    if (invalid || done) {
      haptic("error");
      return;
    }
    try {
      actions.people.settle({
        personId: history.person.id,
        amount,
        accountId: account.id,
      });
    } catch (error) {
      haptic("error");
      if (error instanceof ValidationError) return;
      throw error;
    }
    haptic("success");
    setDone(true);
    setTimeout(() => {
      if (router.canDismiss()) router.dismiss();
      else router.back();
    }, 520);
  };

  const onKey = (key: KeypadKey) => {
    if (key === "=" && view.equalsIsSave) {
      submit();
      return;
    }
    setEntry(keypadReducer(entry, key === "backspace" ? "back" : key));
  };

  return (
    <View
      className="flex-1 bg-bg"
      style={{ paddingTop: Platform.OS === "ios" ? 8 : 0 }}
    >
      <View className="h-12 flex-row items-center px-2">
        <Button
          variant="barSecondary"
          size="sm"
          onPress={() => router.back()}
          accessibilityLabel="Cancel"
        >
          <Text variant="body">Cancel</Text>
        </Button>
        <Text
          variant="headline"
          accessibilityRole="header"
          className="flex-1 text-center"
        >
          Settle up
        </Text>
        <Button
          variant="barPrimary"
          size="sm"
          disabled={invalid}
          onPress={submit}
          accessibilityLabel="Save"
        >
          <Text
            variant="headline"
            style={invalid ? { opacity: 0.4 } : undefined}
          >
            Save
          </Text>
        </Button>
      </View>
      <View className="flex-1 justify-center gap-5 pb-3">
        <View className="items-center gap-2 px-6">
          <Avatar name={history.person.name} size={44} />
          <Text variant="subhead" tone="secondary" numeric numberOfLines={1}>
            {history.person.name} {owed ? "owes you" : "you owe"} {fmt(maximum)}
          </Text>
        </View>
        <View className="overflow-hidden" style={{ minHeight: 80 }}>
          <AmountReadout
            symbol={currencySymbol(currency)}
            value={view.display}
            expression={view.expression}
            accessibilityLabel={`Amount, ${formatMoneyForSpeech(amount, currency, { sign: "none" })}`}
          />
          <Shimmer active={done} />
        </View>
        <View className="items-center">
          <MenuChip
            label={account.name}
            icon="creditcard"
            title={owed ? "Received in" : "Paid from"}
            options={accounts.map((a) => ({ value: a.id, label: a.name }))}
            selected={account.id}
            onSelect={onAccount}
            accessibilityLabel={`Account, ${account.name}`}
          />
        </View>
      </View>
      <View className="bg-bg" style={{ paddingBottom: insets.bottom }}>
        <Keypad
          keyHeight={56}
          onKey={onKey}
          showDecimal={digits > 0}
          saveMode={view.equalsIsSave}
          saveDisabled={invalid}
        />
      </View>
    </View>
  );
}
