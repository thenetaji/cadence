import * as React from 'react';
import { View } from 'react-native';

import { withSkia } from '@/components/charts/with-skia';
import type { MonthlyBarsProps } from '@/components/charts/monthly-bars';
import { Card } from '@/components/ui/card';
import { useMonthlyTotals } from '@/data/hooks';
import { monthShort, parseKey, type Period } from '@studio/dates';
import { formatMoneyForSpeech } from '@studio/money';

import { monthScrub } from './labels';

const MonthlyBars = withSkia<MonthlyBarsProps>(() => import('@/components/charts/monthly-bars').then((m) => ({ default: m.MonthlyBars })));

const SHOWN = 12;

type MonthlyCardProps = {
  /** Month periods, newest first (the screen's month list). */
  months: readonly Period[];
  /** `from` of the month being viewed; null for all time. */
  viewedFrom: string | null;
  /** A bar was tapped: switch to that month. */
  onPick: (period: Period) => void;
  locale?: string;
};

/** Twelve months of spending (brass bars) with income ticks (mint); tap a bar to view that month. */
function MonthlyCard({ months, viewedFrom, onPick, locale }: MonthlyCardProps) {
  const recent = React.useMemo(() => months.slice(0, SHOWN), [months]);
  const totals = useMonthlyTotals(recent);
  // Leading months with nothing in them only waste width; keep at least six.
  const shown = React.useMemo(() => {
    const first = totals.months.findIndex((m) => m.income > 0 || m.spent > 0);
    return totals.months.slice(Math.max(0, Math.min(first < 0 ? 0 : first, totals.months.length - 6)));
  }, [totals.months]);
  const data = React.useMemo(() => shown.map((m) => ({ key: m.key, income: m.income, spent: m.spent })), [shown]);
  const labels = React.useMemo(() => shown.map((m, index) => ({ index, text: monthShort(parseKey(m.to).month) })), [shown]);
  const selectedIndex = viewedFrom === null ? null : shown.findIndex((m) => m.from === viewedFrom);
  const any = shown.some((m) => m.income > 0 || m.spent > 0);
  if (!any) return null;
  const summary = `Spending by month, last ${shown.length} months. ${shown
    .map((m) => `${monthShort(parseKey(m.to).month)} spent ${formatMoneyForSpeech(m.spent, totals.currency, { sign: 'none', locale })}`)
    .join('; ')}`;
  return (
    <Card className="mx-4 rounded-[16px] px-4 pb-1 pt-3">
      <View style={{ height: 150 }}>
        <MonthlyBars
          data={data}
          currency={totals.currency}
          locale={locale}
          labels={labels}
          selectedIndex={selectedIndex !== null && selectedIndex >= 0 ? selectedIndex : null}
          onPick={(i) => {
            const picked = recent.find((p) => p.from === shown[i]?.from);
            if (picked) onPick(picked);
          }}
          formatLabel={(i) => (shown[i] ? monthScrub(shown[i]!, monthShort(parseKey(shown[i]!.to).month), totals.currency, locale) : '')}
          accessibilityLabel={summary}
        />
      </View>
    </Card>
  );
}

export { MonthlyCard };
