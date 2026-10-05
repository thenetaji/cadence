import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import * as React from 'react';
import { ScrollView, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { Amount } from '@/components/app/amount';
import { HeaderButton } from '@/components/app/header-button';
import { SectionHeader } from '@/components/app/section-header';
import { BarChart } from '@/components/charts/bar-chart';
import { Donut } from '@/components/charts/donut';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { useInsights, useSettings, useTodayKey } from '@/data/hooks';
import { axisLabels } from '@/lib/charts';
import { addDays, diffDays, periodLabel, type PeriodSettings, type PeriodType } from '@/lib/dates';
import { formatMoney, formatMoneyForSpeech } from '@/lib/money';
import { useMoneyContext } from '@/features/transactions/use-money-context';
import { useTokens } from '@/theme/use-tokens';

import { CategoryList, type CategoryListItem } from './category-list';
import { barsTitle, deltaLine, scrubLabel } from './labels';
import { donutData, keyForName, listItems, summaryLabel } from './model';
import { canStepForward, parseInsightsParams, periodOf, stepView, type InsightsParams, type InsightsView } from './params';
import { PeriodControls } from './period-controls';
import { useRangeStore } from './range-store';

type Selection = { key: string } | { name: string } | null;

export default function InsightsScreen() {
  const router = useRouter();
  const params: InsightsParams = useLocalSearchParams() as InsightsParams;
  const settings = useSettings();
  const money = useMoneyContext();
  const today = useTodayKey();
  const { colors, scheme } = useTokens();
  const openRange = useRangeStore((s) => s.open);

  const periodSettings = React.useMemo<PeriodSettings>(() => ({ weekStart: settings.week_start, monthStart: settings.month_start }), [settings.week_start, settings.month_start]);
  const [initial] = React.useState(() => parseInsightsParams(params, today, periodSettings));
  const [view, setView] = React.useState<InsightsView>(initial.view);
  const [selection, setSelection] = React.useState<Selection>(initial.select ? { name: initial.select } : null);
  const [scrub, setScrub] = React.useState<number | null>(null);

  const period = periodOf(view, periodSettings);
  const insights = useInsights(period, view.kind);
  const { currency } = insights;
  const fmt = React.useMemo(() => ({ currency, locale: money.locale, showDecimals: money.showDecimals, scheme }), [currency, money.locale, money.showDecimals, scheme]);

  const donut = React.useMemo(() => donutData(insights, fmt), [insights, fmt]);
  const rawKey = selection === null ? null : 'key' in selection ? selection.key : keyForName(insights, selection.name);
  const selectedKey = rawKey !== null && donut.some((d) => d.key === rawKey) ? rawKey : null;
  const rows = React.useMemo(() => listItems(insights, selectedKey), [insights, selectedKey]);
  const selectedColor = donut.find((d) => d.key === selectedKey)?.color;
  const barColor = selectedColor ?? (view.kind === 'income' ? colors.income : undefined);

  const bars = React.useMemo(() => insights.series.map((p) => ({ key: p.key, value: p.amount })), [insights.series]);
  const labels = React.useMemo(() => axisLabels(insights.series.map((p) => p.key), insights.granularity), [insights.series, insights.granularity]);
  const delta = insights.previousTotal > 0 ? deltaLine(insights.delta, period, view.kind) : null;
  const forward = canStepForward(view, today, periodSettings);

  // Period change crossfades 200 ms; the charts themselves do not replay their intro.
  const reduced = useReducedMotion();
  const fade = useSharedValue(1);
  const dataKey = `${period.from}:${period.to}:${view.kind}`;
  React.useEffect(() => {
    if (reduced) return;
    fade.value = 0.3;
    fade.value = withTiming(1, { duration: 200 });
  }, [dataKey, fade, reduced]);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  const reset = () => {
    setSelection(null);
    setScrub(null);
  };
  const step = (direction: 1 | -1) => {
    if (direction === 1 && !forward) return;
    setView((current) => stepView(current, direction, periodSettings));
    reset();
  };
  const editCustom = () => {
    openRange({
      initial: { from: period.from, to: period.to },
      onApply: (range) => {
        setView((current) => ({ ...current, type: 'custom', custom: range }));
        reset();
      },
    });
    router.push('/insights-range' as Href);
  };
  const changeType = (type: PeriodType) => {
    if (type === view.type) return;
    if (type === 'custom') {
      const from = view.custom?.from ?? addDays(today, -29);
      const to = view.custom?.to ?? today;
      setView((current) => ({ ...current, type: 'custom', custom: { from, to } }));
      reset();
      openRange({
        initial: { from, to },
        onApply: (range) => setView((current) => ({ ...current, type: 'custom', custom: range })),
      });
      router.push('/insights-range' as Href);
      return;
    }
    setView((current) => ({ ...current, type, anchor: current.type === 'custom' ? today : current.anchor }));
    reset();
  };
  const toggleKind = () => {
    setView((current) => ({ ...current, kind: current.kind === 'expense' ? 'income' : 'expense' }));
    reset();
  };

  const swipe = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-24, 24])
    .failOffsetY([-16, 16])
    .onEnd((event) => {
      if (event.translationX < -60) step(1);
      else if (event.translationX > 60) step(-1);
    });

  const openCategory = (item: CategoryListItem) => {
    if (item.id === null) return;
    router.push({ pathname: '/category/[id]', params: { id: item.id, from: period.from, to: period.to, type: period.type, kind: view.kind } });
  };

  const decimals = money.showDecimals ? undefined : 0;
  const total = formatMoney(insights.total, currency, { locale: money.locale, decimals });
  const average = formatMoney(insights.average, currency, { locale: money.locale, decimals: 0 });
  const noun = insights.granularity === 'day' ? 'day' : 'month';
  const days = diffDays(period.from, period.to) + 1;

  return (
    <View className="flex-1 bg-bg">
      <Stack.Screen
        options={{
          headerRight: () => (
            <HeaderButton symbol="arrow.left.arrow.right" label={view.kind === 'expense' ? 'Show income' : 'Show expenses'} onPress={toggleKind} />
          ),
        }}
      />
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <PeriodControls
          type={view.type}
          label={periodLabel(period)}
          canForward={forward}
          onType={changeType}
          onStep={step}
          onEditCustom={editCustom}
        />
        <Animated.View style={fadeStyle}>
          <GestureDetector gesture={swipe}>
            <View collapsable={false}>
              <View className="px-4 pb-4 pt-3">
                <Text variant="footnote" tone="secondary">
                  {view.kind === 'expense' ? 'Spent' : 'Earned'}
                </Text>
                <Amount value={total} variant="hero" accessibilityLabel={formatMoneyForSpeech(insights.total, currency, { sign: 'none' })} />
                <View className="h-5">
                  {delta ? (
                    <Text variant="footnote" tone={delta.good ? 'income' : 'secondary'} numeric>
                      {delta.text}
                    </Text>
                  ) : null}
                </View>
              </View>
              <Card className="mx-4 items-center p-0 py-5">
                <Donut
                  data={donut}
                  totalLabel={total}
                  totalCaption={view.kind === 'expense' ? 'Total' : 'Total'}
                  selectedKey={selectedKey}
                  onSelect={(key) => setSelection(key === null ? null : { key })}
                  accessibilityLabel={summaryLabel(insights, view.kind)}
                />
              </Card>
            </View>
          </GestureDetector>

          <Card className="mx-4 mt-4 px-4 pb-1 pt-3">
            <View className="flex-row items-baseline justify-between">
              <Text variant="footnote" tone="secondary">
                {barsTitle(insights.granularity, view.kind)}
              </Text>
              {insights.total > 0 ? (
                <Text variant="footnote" tone="tertiary" numeric>
                  {`Avg ${average}/${noun}`}
                </Text>
              ) : null}
            </View>
            <BarChart
              data={bars}
              currency={currency}
              locale={money.locale}
              labels={labels}
              average={insights.average}
              color={barColor}
              selectedIndex={scrub}
              onSelect={setScrub}
              formatLabel={(index) => scrubLabel(insights.series[index] ?? { key: period.from, amount: 0 }, insights.granularity, currency, money.locale)}
              accessibilityLabel={`${barsTitle(insights.granularity, view.kind)}, ${days} days, average ${average} per ${noun}`}
            />
          </Card>

          <View className="pt-4">
            <SectionHeader title="Categories" />
            <Card className="mx-4 mt-1 p-0">
              {rows.length === 0 ? (
                <Text variant="callout" tone="secondary" className="py-8 text-center">
                  Nothing in this period
                </Text>
              ) : (
                <CategoryList items={rows} currency={currency} locale={money.locale} showDecimals={money.showDecimals} onPress={openCategory} />
              )}
            </Card>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

