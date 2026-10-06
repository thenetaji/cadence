import { useRouter } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';

import { SymbolIcon , Pressable , Text , AnimatedNumber } from '@studio/ui';
import { withSkia } from '@studio/charts';
import type { HomeSpend } from '@/data/hooks';
import { formatMoney, formatMoneyForSpeech } from '@studio/money';
import { withAlpha , useTokens } from '@studio/theme';

import type { CumulativeDuoProps } from '@studio/charts/components';
import { addDays, monthShort, parseKey } from '@studio/dates';

import { FlowLegend } from './spend-legend';

/** Skia loads lazily (CanvasKit first on web), keeping chart code out of the initial graph. */
const CumulativeDuo = withSkia<CumulativeDuoProps>(() => import('@studio/charts/components').then((m) => ({ default: m.CumulativeDuo })));

type SpendHeroProps = {
  spend: HomeSpend;
  /** "October". */
  monthLabel: string;
  /** "September". */
  previousLabel: string;
  /** "1 Oct" and "31 Oct". */
  startLabel: string;
  endLabel: string;
  locale?: string;
  showDecimals: boolean;
};

function DeltaPill({ percent }: { percent: number }) {
  const { colors, incomeSoft } = useTokens();
  const under = percent < 0;
  const tone = under ? colors.income : colors.warning;
  return (
    <View
      className="h-[22px] flex-row items-center gap-[3px] rounded-full pl-1.5 pr-2"
      style={{ backgroundColor: under ? incomeSoft : withAlpha(colors.warning, 0.12) }}
    >
      <SymbolIcon name={under ? 'arrow.down.right' : 'arrow.up.right'} size={11} color={tone} weight="bold" />
      <Text variant="footnote" numeric className="font-semibold" style={{ color: tone }}>
        {`${Math.abs(percent)}% ${under ? 'under' : 'over'}`}
      </Text>
    </View>
  );
}

/** "Spent in October", the 54 pt number, the pace line and the clean area curve. */
function SpendHero({ spend, monthLabel, previousLabel, startLabel, endLabel, locale, showDecimals }: SpendHeroProps) {
  const router = useRouter();
  const decimals = showDecimals ? undefined : 0;
  const formatted = formatMoney(spend.spent, spend.currency, { locale, sign: 'none', decimals });
  const split = /^([^\d]*)(.*)$/.exec(formatted);
  const symbol = split?.[1] ?? '';
  const digits = split?.[2] ?? formatted;
  const pace = spend.previousSameDay > 0 ? `${previousLabel} pace · ${formatMoney(spend.previousSameDay, spend.currency, { locale, sign: 'none', decimals: 0 })} by now` : null;
  const hasDelta = spend.deltaPercent !== null && spend.deltaPercent !== 0;
  const hasChart = spend.series.some((d) => (d.actual ?? 0) > 0 || (d.income ?? 0) > 0);
  const duo = React.useMemo(() => spend.series.map((d) => ({ in: d.income, out: d.actual })), [spend.series]);
  const last = [...duo].reverse().find((d) => d.out !== null);
  const moneyIn = last?.in ?? 0;
  const moneyOut = last?.out ?? 0;
  const compact = (value: number) => formatMoney(value, spend.currency, { locale, sign: 'none', compact: true });
  const formatLabel = (index: number) => {
    const day = parseKey(addDays(spend.from, index));
    const point = duo[index];
    return `${day.day} ${monthShort(day.month)} · In ${compact(point?.in ?? 0)} · Out ${compact(point?.out ?? 0)}`;
  };

  return (
    <View className="mt-[22px]">
      <Pressable
        role="button"
        accessibilityLabel={`Spent in ${monthLabel}, ${formatMoneyForSpeech(spend.spent, spend.currency, { sign: 'none' })}`}
        scale={0.99}
        onPress={() => router.navigate('/insights')}
      >
        <Text variant="subhead" tone="secondary" className="font-medium">
          {`Spent in ${monthLabel}`}
        </Text>
        <View className="mt-1 flex-row items-start" style={{ flexShrink: 1 }}>
          {symbol ? (
            <Text variant="display" numeric className="mr-px text-[44px] font-semibold tracking-[-0.9px]" style={{ marginTop: 3 }}>
              {symbol}
            </Text>
          ) : null}
          <AnimatedNumber value={digits} variant="display" intro fit accessibilityLabel={formatted} />
        </View>
      </Pressable>
      {hasDelta || pace ? (
        <Animated.View
          entering={FadeInDown.delay(300).duration(220).withInitialValues({ opacity: 0, transform: [{ translateY: 6 }] }).reduceMotion(ReduceMotion.System)}
          className="mt-2 flex-row items-center gap-[5px]"
        >
          {hasDelta ? <DeltaPill percent={spend.deltaPercent!} /> : null}
          {pace ? (
            <Text variant="footnote" tone="secondary" numeric numberOfLines={1} className="shrink font-medium">
              {pace}
            </Text>
          ) : null}
        </Animated.View>
      ) : null}
      {hasChart ? (
        <>
          <View className="mt-1.5">
            <CumulativeDuo
              series={duo}
              height={150}
              formatLabel={formatLabel}
              accessibilityLabel={`Cash flow in ${monthLabel}: in ${formatMoneyForSpeech(moneyIn, spend.currency, { sign: 'none' })}, out ${formatMoneyForSpeech(moneyOut, spend.currency, { sign: 'none' })}`}
            />
          </View>
          <View className="mt-1.5 flex-row justify-between" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Text variant="caption" tone="tertiary">
              {startLabel}
            </Text>
            <Text variant="caption" tone="tertiary">
              {endLabel}
            </Text>
          </View>
          <FlowLegend moneyIn={moneyIn} moneyOut={moneyOut} currency={spend.currency} locale={locale} />
        </>
      ) : null}
    </View>
  );
}

export { SpendHero };
