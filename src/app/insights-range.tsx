import DateTimePicker from '@react-native-community/datetimepicker';
import { Stack, useRouter } from 'expo-router';
import * as React from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useRangeStore } from '@/features/insights/range-store';
import { addDays, keyToLocalMs, toDateKey, type DateKey } from '@/lib/dates';
import { useTokens } from '@/theme/use-tokens';

function Row({ label, value, onChange, min, max }: { label: string; value: DateKey; onChange: (key: DateKey) => void; min?: DateKey; max?: DateKey }) {
  const { scheme } = useTokens();
  return (
    <View className="min-h-[52px] flex-row items-center justify-between px-4">
      <Text variant="body">{label}</Text>
      <DateTimePicker
        mode="date"
        display="compact"
        themeVariant={scheme}
        value={new Date(keyToLocalMs(value, 12))}
        minimumDate={min ? new Date(keyToLocalMs(min, 12)) : undefined}
        maximumDate={max ? new Date(keyToLocalMs(max, 12)) : undefined}
        onChange={(_event, date) => {
          if (date) onChange(toDateKey(date));
        }}
      />
    </View>
  );
}

/** Two-date sheet for Insights' Custom period. */
export default function InsightsRange() {
  const router = useRouter();
  const request = useRangeStore((s) => s.request);
  const close = useRangeStore((s) => s.close);
  const [from, setFrom] = React.useState<DateKey>(() => request?.initial.from ?? addDays(toDateKey(Date.now()), -29));
  const [to, setTo] = React.useState<DateKey>(() => request?.initial.to ?? toDateKey(Date.now()));

  const dismiss = () => {
    close();
    router.dismiss();
  };
  const apply = () => {
    const range = from <= to ? { from, to } : { from: to, to: from };
    request?.onApply(range);
    dismiss();
  };

  return (
    <View className="flex-1 bg-bg pt-4">
      <Stack.Screen
        options={{
          headerLeft: () => (
            <Button variant="plainText" size="sm" onPress={dismiss}>
              Cancel
            </Button>
          ),
          headerRight: () => (
            <Button variant="plainText" size="sm" onPress={apply}>
              Done
            </Button>
          ),
        }}
      />
      <View className="mx-4 overflow-hidden rounded-[14px] bg-surface">
        <Row label="From" value={from} onChange={setFrom} max={to} />
        <View className="ml-4 h-px bg-border" />
        <Row label="To" value={to} onChange={setTo} min={from} />
      </View>
    </View>
  );
}
