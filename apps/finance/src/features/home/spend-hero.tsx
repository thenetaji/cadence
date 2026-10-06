import { useIsFocused } from "expo-router";
import * as React from "react";
import { ActionSheetIOS, AppState, Platform, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import {
  SymbolIcon,
  Pressable,
  Text,
  AnimatedNumber,
  OptionPicker,
  type Option,
} from "@studio/ui";
import { foldOlder, withSkia } from "@studio/charts";
import type { AllTimeSpend, HomeSpend } from "@/data/hooks";
import { formatMoney, formatMoneyForSpeech } from "@studio/money";
import { haptic, useTokens } from "@studio/theme";

import type { TideBarsProps, TideChartProps } from "@studio/charts/components";

import { useHeroPeriod, type HeroPeriod } from "./period-store";

/** Skia loads lazily (CanvasKit first on web), keeping chart code out of the initial graph. */
const TideChart = withSkia<TideChartProps>(() =>
  import("@studio/charts/components").then((m) => ({ default: m.TideChart })),
);
const TideBars = withSkia<TideBarsProps>(() =>
  import("@studio/charts/components").then((m) => ({ default: m.TideBars })),
);

const MAX_BARS = 12;
const PERIOD_OPTIONS: readonly Option<HeroPeriod>[] = [
  { value: "month", label: "This month" },
  { value: "all", label: "All time" },
];

type SpendHeroProps = {
  spend: HomeSpend;
  allTime: AllTimeSpend;
  /** "October". */
  monthLabel: string;
  /** Monthly budget in the display currency, 0 when there is none. */
  budget: number;
  locale?: string;
  showDecimals: boolean;
};

/** True while the screen is focused and the app is in the foreground: the only time the water moves. */
function useAnimating(): boolean {
  const focused = useIsFocused();
  const [active, setActive] = React.useState(
    AppState.currentState === "active",
  );
  React.useEffect(() => {
    const sub = AppState.addEventListener("change", (state) =>
      setActive(state === "active"),
    );
    return () => sub.remove();
  }, []);
  return focused && active;
}

/** Native action sheet on iOS; the app's own picker sheet elsewhere. */
function usePeriodMenu(
  period: HeroPeriod,
  onChange: (next: HeroPeriod) => void,
) {
  const [open, setOpen] = React.useState(false);
  const show = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [
            ...PERIOD_OPTIONS.map((o) =>
              o.value === period ? `${o.label}  ✓` : o.label,
            ),
            "Cancel",
          ],
          cancelButtonIndex: PERIOD_OPTIONS.length,
        },
        (index) => {
          const next = PERIOD_OPTIONS[index];
          if (next) onChange(next.value);
        },
      );
    } else setOpen(true);
  };
  const picker = (
    <OptionPicker
      visible={open}
      title="Spent"
      options={PERIOD_OPTIONS}
      selected={period}
      onSelect={onChange}
      onClose={() => setOpen(false)}
    />
  );
  return { show, picker };
}

/** Greeting-less hero: period label, the 54 pt number and the Tide chart (month) or monthly bars (all time). */
function SpendHero({
  spend,
  allTime,
  monthLabel,
  budget,
  locale,
  showDecimals,
}: SpendHeroProps) {
  const { colors } = useTokens();
  const period = useHeroPeriod((s) => s.period);
  const setPeriod = useHeroPeriod((s) => s.set);
  const animating = useAnimating();
  const all = period === "all";
  const menu = usePeriodMenu(period, (next) => {
    if (next === period) return;
    haptic("selection");
    setPeriod(next);
  });

  const decimals = showDecimals ? undefined : 0;
  const total = all ? allTime.spent : spend.spent;
  const currency = all ? allTime.currency : spend.currency;
  const formatted = formatMoney(total, currency, {
    locale,
    sign: "none",
    decimals,
  });
  const split = /^([^\d]*)(.*)$/.exec(formatted);
  const symbol = split?.[1] ?? "";
  const digits = split?.[2] ?? formatted;
  const label = all ? "Spent all time" : `Spent in ${monthLabel}`;

  const cumulative = React.useMemo(
    () => spend.series.flatMap((d) => (d.actual === null ? [] : [d.actual])),
    [spend.series],
  );
  const reference = Math.max(spend.previousTotal, budget);
  const bars = React.useMemo(
    () =>
      foldOlder(
        allTime.months.map((m, i) => ({
          label: m.label,
          amount: m.amount,
          current: i === allTime.months.length - 1,
        })),
        MAX_BARS,
      ),
    [allTime.months],
  );
  const hasChart = all
    ? bars.length > 0
    : cumulative.some((v) => v > 0) || spend.previousTotal > 0;
  const speech = formatMoneyForSpeech(total, currency, { sign: "none" });

  return (
    <View className="mt-2">
      <Pressable
        role="button"
        accessibilityLabel={`${label}, ${speech}`}
        accessibilityHint="Change period"
        scale={0.99}
        onPress={menu.show}
        style={{
          minHeight: 44,
          justifyContent: "center",
          alignSelf: "flex-start",
          paddingRight: 8,
        }}
      >
        <Animated.View
          key={label}
          entering={FadeIn.duration(150)}
          className="flex-row items-center gap-1"
        >
          <Text variant="subhead" tone="secondary" className="font-medium">
            {label}
          </Text>
          <SymbolIcon
            name="chevron.down"
            size={11}
            color={colors.textTertiary}
            weight="bold"
          />
        </Animated.View>
      </Pressable>
      <Pressable
        role="button"
        accessibilityLabel={`${label}, ${speech}`}
        scale={0.99}
        onPress={menu.show}
        style={{ marginTop: -6 }}
      >
        <View className="flex-row items-start" style={{ flexShrink: 1 }}>
        {symbol ? (
          <Text
            variant="display"
            numeric
            className="mr-px text-[44px] font-semibold tracking-[-0.9px]"
            style={{ marginTop: 3 }}
          >
            {symbol}
          </Text>
        ) : null}
        <AnimatedNumber
          value={digits}
          variant="display"
          intro
          fit
          accessibilityLabel={formatted}
        />
        </View>
      </Pressable>
      {hasChart ? (
        <Animated.View
          key={period}
          entering={FadeIn.duration(200)}
          className="mt-5"
        >
          {all ? (
            <TideBars
              bars={bars}
              accessibilityLabel={`Spent per month, ${speech} in total`}
            />
          ) : (
            <TideChart
              cumulative={cumulative}
              days={spend.series.length}
              reference={reference}
              paused={!animating}
              accessibilityLabel={`Spent in ${monthLabel}, ${speech} so far`}
            />
          )}
        </Animated.View>
      ) : null}
      {menu.picker}
    </View>
  );
}

export { SpendHero };
