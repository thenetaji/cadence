import { useRouter } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';

import { SymbolIcon } from '@/components/app/symbol';
import { withSkia } from '@/components/charts/with-skia';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import type { HomeSpend } from '@/data/hooks';
import { AnimatedNumber } from '@/motion/animated-number';
import { formatMoney, formatMoneyForSpeech } from '@/lib/money';
import { withAlpha } from '@/theme/tokens';
import { useTokens } from '@/theme/use-tokens';

import type { SpendCurveProps } from './spend-curve';

/** Skia loads lazily (CanvasKit first on web), keeping chart code out of the initial graph. */
const SpendCurve = withSkia<SpendCurveProps>(() => import('./spend-curve').then((m) => ({ default: m.SpendCurve })));

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
  const hasChart = spend.series.some((d) => (d.actual ?? 0) > 0 || d.pace > 0);

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
          <View className="mt-[18px]" style={{ height: 128 }} pointerEvents="none">
            <SpendCurve series={spend.series} height={128} accessibilityLabel={`Cumulative spending in ${monthLabel} against ${previousLabel}`} />
          </View>
          <View className="mt-2 flex-row justify-between" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Text variant="caption" tone="tertiary">
              {startLabel}
            </Text>
            <Text variant="caption" tone="tertiary">
              {endLabel}
            </Text>
          </View>
        </>
      ) : null}
    </View>
  );
}

export { SpendHero };
