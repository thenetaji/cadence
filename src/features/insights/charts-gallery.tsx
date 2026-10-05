import * as React from 'react';
import { View } from 'react-native';

import { BarChart } from '@/components/charts/bar-chart';
import { Donut } from '@/components/charts/donut';
import { MiniBars } from '@/components/charts/mini-bars';
import { PaceChart, paceLabel } from '@/components/charts/pace-chart';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { axisLabels } from '@/lib/charts';
import { addDays } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { categoryColors } from '@/theme/tokens';
import { useTokens } from '@/theme/use-tokens';

const rupees = (n: number) => Math.round(n * 100);
const INR = { currency: 'INR', locale: 'en-IN' } as const;

function Label({ children }: { children: string }) {
  return (
    <Text variant="footnote" tone="tertiary" className="px-4 uppercase">
      {children}
    </Text>
  );
}

/** Chart components with sample data, for the dev gallery. */
export default function ChartsGallery() {
  const { scheme } = useTokens();
  const palette = categoryColors[scheme];
  const [donutKey, setDonutKey] = React.useState<string | null>('Groceries');
  const [bar, setBar] = React.useState<number | null>(6);
  const [mini, setMini] = React.useState(5);
  const [pace, setPace] = React.useState<number | null>(11);

  const slices = [
    { key: 'Housing', value: 24000, color: palette.brown },
    { key: 'Groceries', value: 12400, color: palette.green },
    { key: 'Food & Drink', value: 9100, color: palette.red },
    { key: 'Transport', value: 5200, color: palette.blue },
    { key: 'Other', value: 2300, color: palette.gray },
  ];
  const total = slices.reduce((s, x) => s + x.value, 0);
  const donut = slices.map((s) => ({
    key: s.key,
    name: s.key,
    value: rupees(s.value),
    amountLabel: formatMoney(rupees(s.value), 'INR', { locale: 'en-IN', decimals: 0 }),
    percentLabel: `${Math.round((s.value * 100) / total)}%`,
    color: s.color,
  }));

  const days = Array.from({ length: 14 }, (_, i) => addDays('2026-09-28', i));
  const amounts = [820, 0, 1240, 460, 2100, 330, 3900, 0, 640, 1180, 90, 2750, 510, 1020];
  const series = days.map((key, i) => ({ key, value: rupees(amounts[i] ?? 0) }));
  const average = Math.round(series.reduce((s, x) => s + x.value, 0) / series.length);

  const mon = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
  const miniData = [18200, 22400, 15800, 26100, 19700, 8400].map((v, i) => ({ key: mon[i] ?? '', label: mon[i] ?? '', value: rupees(v) }));

  const budget = rupees(12000);
  const paceData = Array.from({ length: 30 }, (_, i) => ({
    actual: i < 16 ? Math.round((rupees(9400) * (i + 1) ** 1.15) / 16 ** 1.15) : null,
    pace: Math.round((budget * (i + 1)) / 30),
  }));

  return (
    <View className="gap-8">
      <View className="gap-2">
        <Label>Donut</Label>
        <Card className="mx-4 items-center p-0 py-5">
          <Donut
            data={donut}
            totalLabel={formatMoney(rupees(total), 'INR', { locale: 'en-IN', decimals: 0 })}
            totalCaption="Total"
            selectedKey={donutKey}
            onSelect={setDonutKey}
            accessibilityLabel="Spending by category"
          />
        </Card>
      </View>
      <View className="gap-2">
        <Label>Bar chart</Label>
        <Card className="mx-4 px-4 pb-1 pt-3">
          <BarChart
            data={series}
            {...INR}
            labels={axisLabels(days, 'day')}
            average={average}
            selectedIndex={bar}
            onSelect={setBar}
            formatLabel={(i) => `${days[i]} · ${formatMoney(series[i]?.value ?? 0, 'INR', { locale: 'en-IN', decimals: 0 })}`}
            accessibilityLabel="Daily spending"
          />
        </Card>
      </View>
      <View className="gap-2">
        <Label>Mini bars</Label>
        <Card className="mx-4 px-4 pb-1 pt-3">
          <MiniBars
            data={miniData}
            currentIndex={5}
            selectedIndex={mini}
            onSelect={setMini}
            formatValue={(i) => formatMoney(miniData[i]?.value ?? 0, 'INR', { locale: 'en-IN', decimals: 0 })}
            color={palette.green}
            accessibilityLabel="Groceries, last 6 months"
          />
        </Card>
      </View>
      <View className="gap-2">
        <Label>Pace chart</Label>
        <Card className="mx-4 px-4 pb-1 pt-3">
          <PaceChart
            data={paceData}
            {...INR}
            selectedIndex={pace}
            onSelect={setPace}
            labels={[{ index: 0, text: '1' }, { index: 9, text: '10' }, { index: 19, text: '20' }, { index: 29, text: '30' }]}
            accessibilityLabel={paceLabel(11, paceData[11] ?? { actual: 0, pace: 0 }, 'INR', 'en-IN')}
          />
        </Card>
      </View>
    </View>
  );
}
