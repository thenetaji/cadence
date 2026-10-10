import * as React from "react";
import { View } from "react-native";

import { Card, SegmentedControl, Text } from "@studio/ui";
import { axisLabels, shortDay } from "@studio/charts/lib";
import { TrendLine } from "@studio/charts/components";
import type { Insights } from "@/data/hooks";
import { runningComparison } from "@/lib/insights";
import { monthShort, parseKey, type DateKey, type Period } from "@studio/dates";
import { formatMoney } from "@studio/money";
import { useTokens, withAlpha } from "@studio/theme";

const PREVIOUS: Record<Period["type"], string> = {
  week: "last week",
  month: "last month",
  year: "last year",
  custom: "the period before",
};

type RunningCardProps = {
  insights: Insights;
  period: Period;
  today: DateKey;
  locale?: string;
};

/** This period's running total against the last one's, day by day (month by month for a year). */
function RunningCard({ insights, period, today, locale }: RunningCardProps) {
  const { colors } = useTokens();
  const [scrub, setScrub] = React.useState<number | null>(null);
  const [against, setAgainst] = React.useState<"previous" | "year">("previous");
  const { currency, kind, granularity, series, previousSeries, yearAgoSeries } =
    insights;
  const byYear = against === "year" && yearAgoSeries !== null;
  const running = React.useMemo(
    () =>
      runningComparison(
        series,
        byYear && yearAgoSeries ? yearAgoSeries : previousSeries,
        today,
      ),
    [series, previousSeries, yearAgoSeries, byYear, today],
  );
  const labels = React.useMemo(
    () =>
      axisLabels(
        series.map((p) => p.key),
        granularity,
      ),
    [series, granularity],
  );
  const money = (value: number) =>
    formatMoney(value, currency, { locale, decimals: 0 });
  const previous = byYear ? "last year" : PREVIOUS[period.type];
  const { difference } = running;
  const spending = kind === "expense";
  // Spending less, or earning more, than last time is the good direction.
  const good =
    difference !== null && (spending ? difference < 0 : difference > 0);
  const summary =
    difference === null
      ? null
      : difference === 0
        ? `Level with ${previous}`
        : `${money(Math.abs(difference))} ${difference < 0 ? "less" : "more"} than ${previous}`;
  const label = (index: number) => {
    const point = series[index];
    const now = running.current[index];
    const before = running.previous[index] ?? 0;
    const when = point
      ? granularity === "month"
        ? monthShort(parseKey(point.key).month)
        : shortDay(point.key)
      : "";
    return now === null || now === undefined
      ? `${when} · ${money(before)} ${previous}`
      : `${when} · ${money(now)} · ${money(before)} ${previous}`;
  };
  const tint = spending ? colors.accent : colors.income;

  return (
    <Card className="mx-4 mt-4 px-4 pb-1 pt-3">
      <View className="flex-row items-baseline justify-between">
        <Text variant="footnote" tone="secondary">
          Running total
        </Text>
        {summary ? (
          <Text
            variant="footnote"
            numeric
            tone={good ? "income" : difference === 0 ? "tertiary" : "secondary"}
          >
            {summary}
          </Text>
        ) : null}
      </View>
      <TrendLine
        values={running.current}
        compare={running.previous}
        currency={currency}
        locale={locale}
        labels={labels}
        color={tint}
        selectedIndex={scrub}
        onSelect={setScrub}
        formatLabel={label}
        height={130}
        accessibilityLabel={`Running total${summary ? `, ${summary}` : ""}`}
      />
      <View className="flex-row gap-4 pb-2">
        <View className="flex-row items-center gap-1.5">
          <View
            style={{
              width: 14,
              height: 3,
              borderRadius: 2,
              backgroundColor: tint,
            }}
          />
          <Text variant="caption" tone="secondary">
            {period.type === "custom" ? "This period" : `This ${period.type}`}
          </Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <View className="flex-row gap-0.5">
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={{
                  width: 3,
                  height: 2,
                  borderRadius: 1,
                  backgroundColor: withAlpha(colors.text, 0.35),
                }}
              />
            ))}
          </View>
          <Text variant="caption" tone="secondary">
            {previous.charAt(0).toUpperCase() + previous.slice(1)}
          </Text>
        </View>
      </View>
      {yearAgoSeries !== null ? (
        <View className="pb-2 pt-1">
          <SegmentedControl
            values={[
              PREVIOUS[period.type].charAt(0).toUpperCase() +
                PREVIOUS[period.type].slice(1),
              "Last year",
            ]}
            selectedIndex={byYear ? 1 : 0}
            onChange={(index) => {
              setScrub(null);
              setAgainst(index === 1 ? "year" : "previous");
            }}
            accessibilityLabel="Compare with"
          />
        </View>
      ) : null}
    </Card>
  );
}

export { RunningCard };
