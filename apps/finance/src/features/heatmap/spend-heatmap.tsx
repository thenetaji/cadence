import * as React from "react";
import { View, type LayoutChangeEvent } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { Card, Pressable, Text } from "@studio/ui";
import { useRangeDailyTotals, useSetting } from "@/data/hooks";
import {
  HEAT_LEVELS,
  heatOpacity,
  weekdayLetters,
} from "@/features/calendar/grid";
import { HomeSectionHeader } from "@/features/home/section-header";
import { dayLabel } from "@studio/dates";
import { formatMoney } from "@studio/money";
import { haptic, useTokens, withAlpha } from "@studio/theme";

import {
  buildHeatmap,
  heatmapEnd,
  heatmapStart,
  weeksThatFit,
  type HeatCell,
} from "./model";

const GAP = 4;
const TARGET_CELL = 15;
const MAX_WEEKS = 26;
const LABEL_COLUMN = 14;
const WEEKDAY_NAMES = [
  "Mondays",
  "Tuesdays",
  "Wednesdays",
  "Thursdays",
  "Fridays",
  "Saturdays",
  "Sundays",
];

function useHeatFill() {
  const { colors, isDark } = useTokens();
  return React.useCallback(
    (cell: Pick<HeatCell, "level" | "future">) => {
      if (cell.future) return "transparent";
      if (cell.level === 0)
        return isDark
          ? withAlpha(colors.text, 0.06)
          : withAlpha(colors.text, 0.05);
      return withAlpha(
        colors.accent,
        heatOpacity(cell.level) + (isDark ? 0.08 : 0.12),
      );
    },
    [colors, isDark],
  );
}

type SpendHeatmapProps = {
  todayKey: string;
  locale?: string;
  showDecimals: boolean;
  currency: string;
};

/** GitHub-style grid of daily spending over the last few months; tap a day to read its total. */
function SpendHeatmap({
  todayKey,
  locale,
  showDecimals,
  currency,
}: SpendHeatmapProps) {
  const { colors } = useTokens();
  const fill = useHeatFill();
  const [weekStart] = useSetting("week_start");
  const [width, setWidth] = React.useState(0);
  const [selected, setSelected] = React.useState<string | null>(null);
  const onLayout = React.useCallback(
    (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width),
    [],
  );

  const gridWidth = Math.max(0, width - LABEL_COLUMN - GAP);
  const weeks = weeksThatFit(gridWidth, TARGET_CELL, GAP, MAX_WEEKS) || 18;
  const cell = gridWidth > 0 ? (gridWidth - GAP * (weeks - 1)) / weeks : 0;
  const from = heatmapStart(todayKey, weeks, weekStart);
  const to = heatmapEnd(todayKey, weekStart);
  const totals = useRangeDailyTotals(from, to, "expense");
  const model = React.useMemo(
    () => buildHeatmap(totals.days, todayKey),
    [totals.days, todayKey],
  );
  const letters = React.useMemo(() => weekdayLetters(weekStart), [weekStart]);
  const weekdayNames = React.useMemo(
    () =>
      weekStart === 7
        ? [WEEKDAY_NAMES[6], ...WEEKDAY_NAMES.slice(0, 6)]
        : WEEKDAY_NAMES,
    [weekStart],
  );

  const fmt = (minor: number) =>
    formatMoney(minor, totals.currency || currency, {
      locale,
      sign: "none",
      decimals: showDecimals ? undefined : 0,
    });
  const selectedCell = selected
    ? model.columns.flatMap((c) => c.cells).find((c) => c.dateKey === selected)
    : undefined;
  const summary = selectedCell
    ? `${dayLabel(selectedCell.dateKey, todayKey)} · ${selectedCell.amount > 0 ? fmt(selectedCell.amount) : "Nothing spent"}`
    : model.busiestWeekday !== null
      ? `Most spent on ${weekdayNames[model.busiestWeekday]} · ${model.activeDays} active days`
      : "No spending yet";

  return (
    <View>
      <HomeSectionHeader title="Spending heatmap" />
      <Card className="rounded-[20px] px-4 pb-3.5 pt-3">
        <Animated.View key={summary} entering={FadeIn.duration(150)}>
          <Text
            variant="footnote"
            tone={selectedCell ? "default" : "secondary"}
            numeric
            numberOfLines={1}
            className="pb-2.5"
          >
            {summary}
          </Text>
        </Animated.View>
        <View onLayout={onLayout}>
          {cell > 0 ? (
            <View>
              <View style={{ height: 16 }}>
                {model.columns.map((column, i) =>
                  column.monthLabel ? (
                    <Text
                      key={column.cells[0]?.dateKey ?? i}
                      variant="caption"
                      tone="tertiary"
                      numberOfLines={1}
                      style={{
                        position: "absolute",
                        left: LABEL_COLUMN + GAP + i * (cell + GAP),
                        width: 40,
                      }}
                    >
                      {column.monthLabel}
                    </Text>
                  ) : null,
                )}
              </View>
              <View className="flex-row" style={{ gap: GAP }}>
                <View style={{ width: LABEL_COLUMN, gap: GAP }}>
                  {letters.map((letter, i) => (
                    <View
                      key={i}
                      style={{ height: cell }}
                      className="justify-center"
                    >
                      {i % 2 === 0 ? (
                        <Text
                          variant="caption"
                          tone="tertiary"
                          className="text-[10px] leading-[12px]"
                        >
                          {letter}
                        </Text>
                      ) : null}
                    </View>
                  ))}
                </View>
                {model.columns.map((column, c) => (
                  <View
                    key={column.cells[0]?.dateKey ?? c}
                    style={{ gap: GAP }}
                  >
                    {column.cells.map((day) => {
                      const isSelected = day.dateKey === selected;
                      const isToday = day.dateKey === todayKey;
                      return (
                        <Pressable
                          key={day.dateKey}
                          role="button"
                          disabled={day.future}
                          scale={0.85}
                          hitSlop={GAP / 2}
                          accessibilityLabel={`${dayLabel(day.dateKey, todayKey)}, ${day.amount > 0 ? fmt(day.amount) : "nothing spent"}`}
                          accessibilityState={{ selected: isSelected }}
                          onPress={() => {
                            haptic("selection");
                            setSelected(isSelected ? null : day.dateKey);
                          }}
                          style={{
                            width: cell,
                            height: cell,
                            borderRadius: Math.max(3, Math.round(cell * 0.28)),
                            borderCurve: "continuous",
                            backgroundColor: fill(day),
                            borderWidth: isSelected || isToday ? 1.5 : 0,
                            borderColor: isSelected
                              ? colors.text
                              : colors.accent,
                          }}
                        />
                      );
                    })}
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <View style={{ height: 7 * TARGET_CELL + 6 * GAP + 16 }} />
          )}
        </View>
        <View className="mt-3 flex-row items-center justify-between">
          <Text variant="caption" tone="tertiary">{`Last ${weeks} weeks`}</Text>
          <View
            className="flex-row items-center gap-1"
            accessibilityLabel="Less to more"
          >
            <Text variant="caption" tone="tertiary" className="mr-1">
              Less
            </Text>
            {Array.from({ length: HEAT_LEVELS + 1 }, (_, level) => level)
              .filter((level) => level % 2 === 0 || level === HEAT_LEVELS)
              .map((level) => (
                <View
                  key={level}
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 3,
                    backgroundColor: fill({ level, future: false }),
                  }}
                />
              ))}
            <Text variant="caption" tone="tertiary" className="ml-1">
              More
            </Text>
          </View>
        </View>
      </Card>
    </View>
  );
}

export { SpendHeatmap };
