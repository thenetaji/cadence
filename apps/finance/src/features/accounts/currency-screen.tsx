import * as React from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { CurrencyPicker, ListGroup, ListRow, Input, Text } from "@studio/ui";
import { useActions } from "@/data/actions";
import { useAccounts, useRateLookup, useRates, useSetting } from "@/data/hooks";
import { monthShort, parseKey, toDateKey } from "@studio/dates";
import { currencySymbol } from "@studio/money";
import { haptic, useTokens } from "@studio/theme";

type RateRowProps = {
  base: string;
  quote: string;
  rate: number | null;
  updatedAt: number | null;
  onCommit: (rate: number) => void;
  showSeparator?: boolean;
};

const format = (rate: number | null) =>
  rate === null ? "" : String(Number(rate.toFixed(4)));

/** "1 USD = ₹ [84.5]" with "Updated 3 Oct" beneath; commits on blur or return. */
function RateRow({
  base,
  quote,
  rate,
  updatedAt,
  onCommit,
  showSeparator = false,
}: RateRowProps) {
  const { colors } = useTokens();
  const [text, setText] = React.useState(format(rate));
  const [focused, setFocused] = React.useState(false);
  const commit = () => {
    setFocused(false);
    const value = Number(text.replace(",", "."));
    if (Number.isFinite(value) && value > 0 && value !== rate) {
      onCommit(value);
      haptic("success");
    }
  };
  const updated = updatedAt === null ? null : parseKey(toDateKey(updatedAt));
  return (
    <View className="min-h-[60px] flex-row items-center justify-between gap-3 bg-surface px-4 py-2">
      <View>
        <Text variant="body" numeric>
          1 {base} =
        </Text>
        <Text
          variant="footnote"
          tone={updated || rate !== null ? "tertiary" : "warning"}
        >
          {updated
            ? `Updated ${updated.day} ${monthShort(updated.month)}`
            : rate !== null
              ? "Set"
              : "Rate needed"}
        </Text>
      </View>
      <View className="h-9 w-[132px] flex-row items-center gap-1 overflow-hidden rounded-[10px] bg-fill px-3">
        <Text variant="body" tone="secondary">
          {currencySymbol(quote)}
        </Text>
        <Input
          variant="inline"
          value={focused ? text : format(rate)}
          onChangeText={setText}
          onFocus={() => {
            setText(format(rate));
            setFocused(true);
          }}
          onBlur={commit}
          onSubmitEditing={commit}
          keyboardType="decimal-pad"
          returnKeyType="done"
          placeholder="0"
          selectTextOnFocus
          accessibilityLabel={`${base} to ${quote} rate`}
          className="h-9 min-h-0 min-w-0 flex-1 py-0 text-right"
          style={{ minWidth: 0 }}
        />
      </View>
      {showSeparator ? (
        <View
          pointerEvents="none"
          style={{
            left: 16,
            height: StyleSheet.hairlineWidth,
            backgroundColor: colors.separator,
          }}
          className="absolute bottom-0 right-0"
        />
      ) : null}
    </View>
  );
}

/** Display currency and the manual rates that convert every other account currency into it. */
export default function CurrencyScreen() {
  const actions = useActions();
  const [displayCurrency, setDisplayCurrency] = useSetting("display_currency");
  const accounts = useAccounts();
  const lookup = useRateLookup();
  const stored = useRates();
  const [open, setOpen] = React.useState(false);

  const foreign = React.useMemo(
    () =>
      [...new Set(accounts.map((a) => a.currency))]
        .filter((code) => code !== displayCurrency)
        .sort(),
    [accounts, displayCurrency],
  );
  const updatedAt = (base: string) =>
    stored.find(
      (r) =>
        (r.base === base && r.quote === displayCurrency) ||
        (r.base === displayCurrency && r.quote === base),
    )?.updatedAt ?? null;

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerClassName="gap-6 py-4 pb-12"
      keyboardShouldPersistTaps="handled"
    >
      <ListGroup>
        <ListRow
          label="Currency"
          value={`${currencySymbol(displayCurrency)} ${displayCurrency}`}
          chevron
          onPress={() => setOpen(true)}
        />
      </ListGroup>
      {foreign.length > 0 ? (
        <ListGroup header="Exchange rates">
          {foreign.map((code) => (
            <RateRow
              key={`${code}:${displayCurrency}`}
              base={code}
              quote={displayCurrency}
              rate={lookup(code, displayCurrency)}
              updatedAt={updatedAt(code)}
              onCommit={(rate) =>
                actions.fx.setRate(code, displayCurrency, rate)
              }
            />
          ))}
        </ListGroup>
      ) : null}
      <CurrencyPicker
        visible={open}
        selected={displayCurrency}
        onSelect={setDisplayCurrency}
        onClose={() => setOpen(false)}
      />
    </ScrollView>
  );
}
