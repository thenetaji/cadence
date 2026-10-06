import { useRouter } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';

import { AppIcon } from '@/icons/app-icon';
import { Button } from '@/components/ui/button';
import { Pressable } from '@/components/ui/pressable';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Text } from '@/components/ui/text';
import { Hairline } from '@/features/transaction-form/chips';
import { DatePicker } from '@/features/transaction-form/date-picker';
import { useDraftStore } from '@/features/transaction-form/store';
import { addDays, keyToLocalMs, toDateKey } from '@studio/dates';
import type { Frequency } from '@/lib/recurring';
import { useTokens } from '@studio/theme';

const UNITS: readonly Frequency[] = ['daily', 'weekly', 'monthly', 'yearly'];
const UNIT_LABELS = ['Days', 'Weeks', 'Months', 'Years'] as const;
const MAX_INTERVAL = 99;

function Stepper({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const { colors } = useTokens();
  const button = (symbol: string, label: string, next: number, disabled: boolean) => (
    <Pressable role="button" accessibilityLabel={label} haptic="light" disabled={disabled} onPress={() => onChange(next)} className="h-9 w-9 items-center justify-center rounded-full bg-fill" style={{ opacity: disabled ? 0.4 : 1 }}>
      <AppIcon name={symbol} size={14} color={colors.text} />
    </Pressable>
  );
  return (
    <View className="flex-row items-center gap-3">
      {button('minus', 'Decrease', value - 1, value <= 1)}
      <Text variant="body" numeric className="min-w-8 text-center font-medium" accessibilityLabel={`Every ${value}`}>
        {value}
      </Text>
      {button('plus', 'Increase', value + 1, value >= MAX_INTERVAL)}
    </View>
  );
}

/** Custom repeat sheet: every N units, ends never or on a date. Writes the draft on Done. */
export default function RepeatSheet() {
  const router = useRouter();
  const initial = useDraftStore.getState().repeat;
  const occurredAt = useDraftStore.getState().occurredAt;
  const [frequency, setFrequency] = React.useState<Frequency>(initial?.frequency ?? 'weekly');
  const [interval, setInterval] = React.useState(Math.max(initial?.interval ?? 2, 1));
  const [endDate, setEndDate] = React.useState<string | null>(initial?.endDate ?? null);

  const done = () => {
    useDraftStore.getState().patch({ repeat: { frequency, interval, endDate } });
    router.back();
  };
  const endMs = endDate ? keyToLocalMs(endDate, 12) : keyToLocalMs(addDays(toDateKey(occurredAt), 30), 12);

  return (
    <View className="flex-1 bg-bg pt-2">
      <View className="h-12 flex-row items-center px-2">
        <View className="w-20 items-start">
          <Button variant="barSecondary" size="sm" onPress={() => router.back()} accessibilityLabel="Cancel">
            <Text variant="body">Cancel</Text>
          </Button>
        </View>
        <Text variant="headline" accessibilityRole="header" className="flex-1 text-center">
          Repeat
        </Text>
        <View className="w-20 items-end">
          <Button variant="barPrimary" size="sm" onPress={done} accessibilityLabel="Done">
            <Text variant="headline">Done</Text>
          </Button>
        </View>
      </View>
      <View className="mx-4 mt-2 overflow-hidden rounded-2xl bg-surface">
        <View className="h-12 flex-row items-center justify-between px-4">
          <Text variant="body">Every</Text>
          <Stepper value={interval} onChange={setInterval} />
        </View>
        <Hairline />
        <View className="px-4 py-2.5">
          <SegmentedControl values={UNIT_LABELS} selectedIndex={UNITS.indexOf(frequency)} onChange={(i) => setFrequency(UNITS[i] ?? 'weekly')} accessibilityLabel="Unit" />
        </View>
        <Hairline />
        <View className="h-12 flex-row items-center justify-between px-4">
          <Text variant="body">Ends</Text>
          <View className="w-44">
            <SegmentedControl
              values={['Never', 'On date']}
              selectedIndex={endDate ? 1 : 0}
              onChange={(i) => setEndDate(i === 0 ? null : toDateKey(endMs))}
              accessibilityLabel="Ends"
            />
          </View>
        </View>
        {endDate ? (
          <>
            <Hairline />
            <View className="h-12 flex-row items-center justify-between px-4">
              <Text variant="body">On date</Text>
              <DatePicker value={endMs} mode="date" display="compact" minimumDate={occurredAt} onChange={(ms) => setEndDate(toDateKey(ms))} />
            </View>
          </>
        ) : null}
      </View>
    </View>
  );
}
