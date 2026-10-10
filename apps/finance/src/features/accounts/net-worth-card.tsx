import * as React from "react";
import { View } from "react-native";

import { Card, SegmentedControl, Text } from "@studio/ui";
import { axisLabels } from "@studio/charts/lib";
import { TrendLine } from "@studio/charts/components";
import { useBalanceHistory, useTodayKey } from "@/data/hooks";
import { HISTORY_RANGES, type HistoryRange } from "@/lib/balance/history";
import { monthShort, parseKey } from "@studio/dates";
import { formatMoney, formatMoneyForSpeech } from "@studio/money";
import { useTokens } from "@studio/theme";

const RANGE_LABELS: Record<HistoryRange, string> = {
  "3m": "3M",
  "1y": "1Y",
  all: "All",
};
const RANGE_SPEECH: Record<HistoryRange, string> = {
  "3m": "in 3 months",
  "1y": "in a year",
  all: "all time",
};
const RANGE_SUFFIX: Record<HistoryRange, string> = {
  "3m": "3 months",
  "1y": "1 year",
  all: "all time",
};

type NetWorthCardProps = {
  /** One account's balance over time; omit for every active account (net worth). */
  accountId?: string;
  title?: string;
  locale?: string;
};

/** Balance over time with a 3M / 1Y / All switch, the change over the range and a scrubbable line. */
export default function NetWorthCard({
  accountId,
  title = "Net worth",
  locale,
}: NetWorthCardProps) {
  const today = useTodayKey();
  const { colors } = useTokens();
  const [range, setRange] = React.useState<HistoryRange>("3m");
  const [scrub, setScrub] = React.useState<number | null>(null);
  const history = useBalanceHistory(range, today, accountId);
  const { currency, points, change } = history;

  const values = React.useMemo(() => points.map((p) => p.value), [points]);
  const labels = React.useMemo(
    () =>
      axisLabels(
        points.map((p) => p.key),
        range === "all" && points.length > 92 ? "month" : "day",
      ),
    [points, range],
  );
  const changeText = `${change > 0 ? "+" : change < 0 ? "−" : ""}${formatMoney(
    Math.abs(change),
    currency,
    { locale, decimals: 0 },
  )}`;
  const label = (index: number) => {
    const point = points[index];
    if (!point) return "";
    const { day, month, year } = parseKey(point.key);
    return `${day} ${monthShort(month)} ${year} · ${formatMoney(point.value, currency, { locale, decimals: 0 })}`;
  };

  return (
    <Card className="mx-4 px-4 pb-2 pt-3">
      <View className="flex-row items-baseline justify-between">
        <Text variant="footnote" tone="secondary">
          {title}
        </Text>
        <Text
          variant="footnote"
          numeric
          tone={change > 0 ? "income" : change < 0 ? "expense" : "tertiary"}
          accessibilityLabel={`${change >= 0 ? "Up" : "Down"} ${formatMoneyForSpeech(Math.abs(change), currency, { sign: "none", locale })} ${RANGE_SPEECH[range]}`}
        >
          {`${changeText} · ${RANGE_SUFFIX[range]}`}
        </Text>
      </View>
      <TrendLine
        values={values}
        currency={currency}
        locale={locale}
        labels={labels}
        color={change < 0 ? colors.expense : colors.accent}
        selectedIndex={scrub}
        onSelect={setScrub}
        formatLabel={label}
        accessibilityLabel={`${title} ${RANGE_SPEECH[range]}, ${change >= 0 ? "up" : "down"} ${formatMoneyForSpeech(Math.abs(change), currency, { sign: "none", locale })}`}
      />
      <View className="pb-2 pt-1">
        <SegmentedControl
          values={HISTORY_RANGES.map((r) => RANGE_LABELS[r])}
          selectedIndex={HISTORY_RANGES.indexOf(range)}
          onChange={(index) => {
            setScrub(null);
            setRange(HISTORY_RANGES[index] ?? "3m");
          }}
          accessibilityLabel="Range"
        />
      </View>
    </Card>
  );
}
