import * as React from 'react';
import { ScrollView, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeIn } from 'react-native-reanimated';

import { SectionHeader } from '@/components/app/section-header';
import { Card } from '@/components/ui/card';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { useDailyTotals, usePeriodTransactions, useSetting, useTodayKey } from '@/data/hooks';
import { TransactionListRow } from '@/features/transactions/transaction-list-row';
import { useMoneyContext } from '@/features/transactions/use-money-context';
import { dayLabel, monthName, parseKey } from '@studio/dates';
import { formatMoney } from '@studio/money';
import { haptic } from '@/theme/haptics';
import { withAlpha } from '@/theme/tokens';
import { useTokens } from '@/theme/use-tokens';

import { buildMonthGrid, heatOpacity, monthOf, weekdayLetters, type CalendarCell } from './grid';

const GAP = 6;

type CalendarViewProps = {
  /** `YYYY-MM`. */
  month: string;
  selected: string | null;
  onSelect: (dateKey: string) => void;
  /** Swipe left = +1, right = -1. */
  onStep: (delta: 1 | -1) => void;
  bottomInset?: number;
};

function Cell({ cell, size, today, selected, onPress }: { cell: CalendarCell; size: number; today: boolean; selected: boolean; onPress: () => void }) {
  const { colors, isDark } = useTokens();
  const money = useMoneyContext();
  const spent = cell.level > 0;
  const fill = spent ? withAlpha(colors.accent, heatOpacity(cell.level)) : isDark ? '#000000' : colors.fill;
  const ring = selected ? colors.accent : today ? colors.text : spent ? 'transparent' : colors.border;
  const label = spent ? formatMoney(cell.amount, money.displayCurrency, { compact: true, locale: money.locale, sign: 'none' }) : '';
  return (
    <Pressable
      role="button"
      scale={0.94}
      accessibilityLabel={`${dayLabel(cell.dateKey, '')}${spent ? `, ${label}` : ''}`}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={{
        width: size,
        height: size,
        borderRadius: 11,
        backgroundColor: fill,
        borderWidth: selected || today ? 2 : 1,
        borderColor: ring,
      }}
      className="items-center justify-center"
    >
      <Text variant="footnote" numeric tone={cell.level >= 5 && isDark ? 'inverted' : 'default'} className={today || selected ? 'font-semibold' : undefined} style={cell.level >= 5 && isDark ? { color: '#15120B' } : undefined}>
        {cell.day}
      </Text>
      {spent ? (
        <Text
          numeric
          numberOfLines={1}
          className="text-[9px] leading-[11px]"
          style={{ color: cell.level >= 5 && isDark ? '#15120B' : colors.textSecondary, maxWidth: size - 4 }}
        >
          {label}
        </Text>
      ) : (
        <View style={{ height: 11 }} />
      )}
    </Pressable>
  );
}

/** Month heatmap (7 columns, honours week_start) with the selected day's transactions underneath. */
export function CalendarView({ month, selected, onSelect, onStep, bottomInset = 96 }: CalendarViewProps) {
  const money = useMoneyContext();
  const todayKey = useTodayKey();
  const [weekStart] = useSetting('week_start');
  const totals = useDailyTotals(month, 'expense');
  const [width, setWidth] = React.useState(0);
  const onLayout = React.useCallback((e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width), []);
  const size = width > 0 ? Math.floor((width - GAP * 6) / 7) : 0;
  const rows = React.useMemo(() => buildMonthGrid(totals.days, totals.max, totals.firstWeekday, weekStart), [totals, weekStart]);
  const letters = React.useMemo(() => weekdayLetters(weekStart), [weekStart]);

  const day = selected && monthOf(selected) === month ? selected : null;
  const items = usePeriodTransactions({ from: day ?? '0000-01-01', to: day ?? '0000-01-01', kinds: ['expense', 'income', 'transfer'] });

  const swipe = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-24, 24])
    .failOffsetY([-16, 16])
    .onEnd((event) => {
      if (event.translationX < -60) onStep(1);
      else if (event.translationX > 60) onStep(-1);
    });

  const { year, month: m } = parseKey(`${month}-01`);
  const monthTotal = formatMoney(totals.total, totals.currency, { locale: money.locale, sign: 'none', decimals: money.showDecimals ? undefined : 0 });

  return (
    <ScrollView className="flex-1" contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ paddingBottom: bottomInset }}>
      <GestureDetector gesture={swipe}>
        <Animated.View key={month} entering={FadeIn.duration(180)} className="px-4 pt-3">
          <View className="flex-row items-baseline justify-between px-1 pb-3">
            <Text variant="footnote" tone="secondary">
              {`${monthName(m)} ${year}`}
            </Text>
            <Text variant="footnote" tone="secondary" numeric>
              {`${monthTotal} spent`}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: GAP, paddingBottom: GAP }}>
            {letters.map((letter, i) => (
              <View key={i} style={{ width: size || undefined, flex: size ? undefined : 1 }} className="items-center">
                <Text variant="caption" tone="tertiary">
                  {letter}
                </Text>
              </View>
            ))}
          </View>
          <View onLayout={onLayout} style={{ gap: GAP }}>
            {size > 0
              ? rows.map((row, r) => (
                  <View key={r} style={{ flexDirection: 'row', gap: GAP }}>
                    {row.map((cell, c) =>
                      cell ? (
                        <Cell
                          key={cell.dateKey}
                          cell={cell}
                          size={size}
                          today={cell.dateKey === todayKey}
                          selected={cell.dateKey === day}
                          onPress={() => {
                            haptic('selection');
                            onSelect(cell.dateKey);
                          }}
                        />
                      ) : (
                        <View key={`b${c}`} style={{ width: size, height: size }} />
                      ),
                    )}
                  </View>
                ))
              : null}
          </View>
        </Animated.View>
      </GestureDetector>
      {day ? (
        <View>
          <SectionHeader title={dayLabel(day, todayKey)} />
          {items.length > 0 ? (
            <Card className="mx-4 p-0">
              {items.map((item, index) => (
                <TransactionListRow key={item.id} item={item} context={money} separator={index < items.length - 1} />
              ))}
            </Card>
          ) : (
            <Text variant="subhead" tone="tertiary" className="px-4">
              No transactions
            </Text>
          )}
        </View>
      ) : null}
    </ScrollView>
  );
}
