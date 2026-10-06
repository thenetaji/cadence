import { useRouter } from 'expo-router';
import * as React from 'react';
import { StyleSheet, View } from 'react-native';

import { IconTile , SectionHeader , Card , Pressable , Text , AnimatedNumber } from '@studio/ui';
import { BarChart , PairedBars } from '@studio/charts/components';
import type { Insights, InsightsExtras } from '@/data/hooks';
import { monthShort, parseKey } from '@studio/dates';
import { formatMoney, formatMoneyForSpeech } from '@studio/money';
import { categoryKeys, type CategoryColorKey } from '@studio/theme';
import { useTokens } from '@studio/theme';

import { monthlyScrub, peakCaption, percentText, weekdayShort } from './labels';
import type { InsightsKind } from './params';

const TILE = { flex: 1, flexBasis: 0, minWidth: 0 } as const;
const CARD = 'mx-4 rounded-[16px] p-4';

const asColor = (value: string | undefined): CategoryColorKey => ((categoryKeys as readonly string[]).includes(value ?? '') ? (value as CategoryColorKey) : 'gray');

type MoneyProps = { currency: string; locale?: string };

/** Hairline-tracked share bar; `fraction` is 0-1. */
function ShareBar({ fraction, color, height = 4 }: { fraction: number; color: string; height?: number }) {
  const { colors } = useTokens();
  const width = Math.max(fraction * 100, fraction > 0 ? 2 : 0);
  return (
    <View className="overflow-hidden" style={{ height, borderRadius: height / 2, backgroundColor: colors.fill }}>
      <View style={{ width: `${width}%`, height, borderRadius: height / 2, backgroundColor: color }} />
    </View>
  );
}

type TileProps = { label: string; value: string; caption?: string; tone?: 'default' | 'income'; onPress?: () => void; accessibilityLabel: string };

function Tile({ label, value, caption, tone = 'default', onPress, accessibilityLabel }: TileProps) {
  const body = (
    <>
      <Text variant="footnote" tone="secondary" numberOfLines={1}>
        {label}
      </Text>
      <AnimatedNumber value={value} variant="headline" tone={tone} fit className="mt-1" />
      {caption ? (
        <Text variant="caption" tone="tertiary" numberOfLines={1} className="mt-0.5">
          {caption}
        </Text>
      ) : null}
    </>
  );
  if (!onPress) {
    return (
      <Card className="rounded-[16px] px-4 py-3" style={TILE} accessible accessibilityLabel={accessibilityLabel}>
        {body}
      </Card>
    );
  }
  return (
    <Pressable role="button" accessibilityLabel={accessibilityLabel} onPress={onPress} scale={0.98} style={TILE}>
      <Card className="flex-1 rounded-[16px] px-4 py-3">{body}</Card>
    </Pressable>
  );
}

type StatsGridProps = MoneyProps & { extras: InsightsExtras; both?: boolean };

/** Daily average, biggest, count and savings rate as four compact tiles. */
const StatsGrid = React.memo(function StatsGrid({ extras, both = false, currency, locale }: StatsGridProps) {
  const router = useRouter();
  const money = (value: number) => formatMoney(value, currency, { locale, decimals: 0 });
  const speech = (value: number) => formatMoneyForSpeech(value, currency, { sign: 'none', locale });
  const { biggest, savingsRate } = extras;
  const biggestName = biggest ? biggest.title || biggest.category?.name || 'Untitled' : undefined;
  const rate = percentText(savingsRate);
  return (
    <View className="gap-3 px-4">
      <View className="flex-row gap-3">
        <Tile label={both ? 'Daily spend' : 'Daily average'} value={money(extras.dailyAverage)} accessibilityLabel={`${both ? 'Daily spend' : 'Daily average'}, ${speech(extras.dailyAverage)}`} />
        {both ? (
          <Tile
            label="Savings rate"
            value={rate}
            tone={savingsRate !== null && savingsRate >= 0 ? 'income' : 'default'}
            accessibilityLabel={savingsRate === null ? 'Savings rate, nothing earned' : `Savings rate, ${savingsRate} percent`}
          />
        ) : (
          <Tile label="Transactions" value={String(extras.transactionCount)} accessibilityLabel={`${extras.transactionCount} transactions`} />
        )}
      </View>
      <View className="flex-row gap-3">
        <Tile
          label={both ? 'Biggest expense' : 'Biggest'}
          value={biggest ? money(biggest.amount) : '—'}
          caption={biggestName}
          accessibilityLabel={biggest ? `Biggest, ${biggestName}, ${speech(biggest.amount)}` : 'Biggest, none'}
          onPress={biggest ? () => router.push({ pathname: '/transaction/[id]', params: { id: biggest.transactionId } }) : undefined}
        />
        {both ? (
          <Tile label="Expenses" value={String(extras.transactionCount)} accessibilityLabel={`${extras.transactionCount} expenses`} />
        ) : (
          <Tile
            label="Savings rate"
            value={rate}
            tone={savingsRate !== null && savingsRate >= 0 ? 'income' : 'default'}
            accessibilityLabel={savingsRate === null ? 'Savings rate, nothing earned' : `Savings rate, ${savingsRate} percent`}
          />
        )}
      </View>
    </View>
  );
});

type IncomeSourcesProps = MoneyProps & { insights: Insights };

/** Both mode: where the money came from, as compact share bars in each source's colour. */
const IncomeSourcesCard = React.memo(function IncomeSourcesCard({ insights, currency, locale }: IncomeSourcesProps) {
  const { category } = useTokens();
  const top = insights.categories.slice(0, 5);
  if (top.length === 0) return null;
  const largest = top[0]!.amount;
  return (
    <>
      <SectionHeader title="Income by source" />
      <Card className={`${CARD} gap-4`}>
        {top.map((row) => {
          const color = category[asColor(row.category?.color)];
          const name = row.category?.name ?? 'Uncategorised';
          return (
            <View key={row.categoryId ?? 'none'} accessible accessibilityLabel={`${name}, ${formatMoneyForSpeech(row.amount, currency, { sign: 'none' })}, ${row.percent} percent`}>
              <View className="flex-row items-center pb-1.5">
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
                <Text variant="subhead" numberOfLines={1} className="ml-2 mr-3 flex-1 font-medium">
                  {name}
                </Text>
                <Text variant="subhead" numeric className="font-medium">
                  {formatMoney(row.amount, currency, { locale, decimals: 0 })}
                </Text>
                <Text variant="footnote" tone="tertiary" numeric className="w-10 text-right">
                  {`${row.percent}%`}
                </Text>
              </View>
              <ShareBar fraction={largest > 0 ? row.amount / largest : 0} color={color} height={6} />
            </View>
          );
        })}
      </Card>
    </>
  );
});

type MonthlyProps = MoneyProps & { monthly: InsightsExtras['monthly'] };

/** Income against spending for six months. */
const MonthlyCard = React.memo(function MonthlyCard({ monthly, currency, locale }: MonthlyProps) {
  const { colors } = useTokens();
  const [scrub, setScrub] = React.useState<number | null>(null);
  const data = React.useMemo(() => monthly.map((m) => ({ key: m.key, a: m.income, b: m.spent })), [monthly]);
  const labels = React.useMemo(() => monthly.map((m, index) => ({ index, text: monthShort(parseKey(m.key).month) })), [monthly]);
  const summary = `Income versus spending, last ${monthly.length} months. ${monthly.map((m) => `${monthShort(parseKey(m.key).month)} in ${formatMoneyForSpeech(m.income, currency, { sign: 'none' })}, out ${formatMoneyForSpeech(m.spent, currency, { sign: 'none' })}`).join('; ')}`;
  return (
    <>
      <SectionHeader title="Income vs spending" />
      <Card className={CARD}>
        <View className="flex-row items-center gap-4 pb-1">
          {[
            { text: 'Income', color: colors.income },
            { text: 'Spending', color: colors.accent },
          ].map((item) => (
            <View key={item.text} className="flex-row items-center">
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: item.color }} />
              <Text variant="footnote" tone="secondary" className="ml-1.5">
                {item.text}
              </Text>
            </View>
          ))}
        </View>
        <PairedBars
          data={data}
          currency={currency}
          locale={locale}
          labels={labels}
          selectedIndex={scrub}
          onSelect={setScrub}
          formatLabel={(i) => (monthly[i] ? monthlyScrub(monthly[i], currency, locale) : '')}
          accessibilityLabel={summary}
        />
      </Card>
    </>
  );
});

type WeekdayProps = MoneyProps & { extras: InsightsExtras };

/** Average per weekday with the highest one picked out. */
const WeekdayCard = React.memo(function WeekdayCard({ extras, currency, locale }: WeekdayProps) {
  const [scrub, setScrub] = React.useState<number | null>(null);
  const { weekdays, peakWeekday } = extras;
  const data = React.useMemo(() => weekdays.map((d) => ({ key: String(d.weekday), value: d.average })), [weekdays]);
  const labels = React.useMemo(() => weekdays.map((d, index) => ({ index, text: weekdayShort(d.weekday) })), [weekdays]);
  const peakIndex = peakWeekday === null ? null : peakWeekday;
  const mean = weekdays.reduce((s, d) => s + d.average, 0) / 7;
  const caption = peakIndex === null ? null : peakCaption(weekdays[peakIndex]!.weekday);
  const amount = (value: number) => formatMoney(value, currency, { locale, decimals: 0 });
  return (
    <>
      <SectionHeader title="By weekday" />
      <Card className={`${CARD} pb-3`}>
        <BarChart
          data={data}
          currency={currency}
          locale={locale}
          labels={labels}
          average={mean}
          selectedIndex={scrub}
          onSelect={setScrub}
          highlightIndex={peakIndex}
          height={120}
          formatLabel={(i) => `${weekdayShort(weekdays[i]?.weekday ?? 1)} · avg ${amount(weekdays[i]?.average ?? 0)}`}
          accessibilityLabel={`Average by weekday. ${caption ?? 'Nothing yet'}`}
        />
        {caption ? (
          <Text variant="subhead" tone="secondary" className="pt-1">
            {caption}
          </Text>
        ) : null}
      </Card>
    </>
  );
});

type MerchantsProps = MoneyProps & { merchants: InsightsExtras['merchants']; kind: InsightsKind };

/** The five titles that took the most, with a thin share bar each. */
const MerchantsCard = React.memo(function MerchantsCard({ merchants, kind, currency, locale }: MerchantsProps) {
  const router = useRouter();
  const { colors, category } = useTokens();
  if (merchants.length === 0) return null;
  const top = merchants[0]!.amount;
  return (
    <>
      <SectionHeader title={kind === 'income' ? 'Top sources' : 'Top merchants'} />
      <Card className="mx-4 rounded-[16px] p-0">
        {merchants.map((m, index) => {
          const color = asColor(m.category?.color);
          return (
            <Pressable
              key={m.key}
              role="button"
              accessibilityLabel={`${m.title}, ${m.count} times, ${formatMoneyForSpeech(m.amount, currency, { sign: 'none' })}`}
              onPress={() => router.push({ pathname: '/search', params: { q: m.title } })}
              scale={1}
              className="min-h-[60px] flex-row items-center bg-surface px-4 py-2.5 active:bg-fill"
            >
              <IconTile icon={m.category?.icon ?? 'tag.fill'} color={color} />
              <View className="ml-3 flex-1">
                <Text variant="body" numberOfLines={1}>
                  {m.title}
                </Text>
                <View className="mt-1.5">
                  <ShareBar fraction={top > 0 ? m.amount / top : 0} color={category[color]} />
                </View>
              </View>
              <View className="ml-4 items-end" style={{ minWidth: 72 }}>
                <Text variant="body" numeric numberOfLines={1} className="font-medium">
                  {formatMoney(m.amount, currency, { locale, decimals: 0 })}
                </Text>
                <Text variant="caption" tone="tertiary" numeric>
                  {`${m.count}×`}
                </Text>
              </View>
              {index === merchants.length - 1 ? null : (
                <View pointerEvents="none" style={{ left: 64, height: StyleSheet.hairlineWidth, backgroundColor: colors.separator }} className="absolute bottom-0 right-0" />
              )}
            </Pressable>
          );
        })}
      </Card>
    </>
  );
});

type AccountsProps = MoneyProps & { accounts: InsightsExtras['accounts'] };

/** One horizontal bar per account in its own colour. */
const AccountsCard = React.memo(function AccountsCard({ accounts, currency, locale }: AccountsProps) {
  const { category } = useTokens();
  if (accounts.length < 2) return null;
  return (
    <>
      <SectionHeader title="By account" />
      <Card className={`${CARD} gap-4`}>
        {accounts.map((a) => {
          const color = category[asColor(a.account?.color)];
          const name = a.account?.name ?? 'Account';
          return (
            <View key={a.accountId} accessible accessibilityLabel={`${name}, ${formatMoneyForSpeech(a.amount, currency, { sign: 'none' })}, ${a.percent} percent`}>
              <View className="flex-row items-baseline justify-between pb-1.5">
                <Text variant="body" numberOfLines={1} className="mr-3 flex-1">
                  {name}
                </Text>
                <Text variant="body" numeric className="font-medium">
                  {formatMoney(a.amount, currency, { locale, decimals: 0 })}
                </Text>
                <Text variant="footnote" tone="tertiary" numeric className="w-10 text-right">
                  {`${a.percent}%`}
                </Text>
              </View>
              <ShareBar fraction={a.percent / 100} color={color} height={8} />
            </View>
          );
        })}
      </Card>
    </>
  );
});

export { AccountsCard, IncomeSourcesCard, MerchantsCard, MonthlyCard, StatsGrid, WeekdayCard };
