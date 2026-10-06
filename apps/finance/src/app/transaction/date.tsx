import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { useTodayKey } from '@/data/hooks';
import { Button , Text } from '@studio/ui';
import { DatePicker } from '@/features/transaction-form/date-picker';
import { withDateKey } from '@/features/transaction-form/logic';
import { useDraftStore } from '@/features/transaction-form/store';
import { toDateKey, addDays } from '@studio/dates';
import { haptic } from '@studio/theme';

/** Date sheet: Today/Yesterday quick buttons over an inline picker; edits the draft live. */
export default function DateSheet() {
  const router = useRouter();
  const occurredAt = useDraftStore((s) => s.occurredAt);
  const key = toDateKey(occurredAt);
  const today = useTodayKey();
  const set = (ms: number) => useDraftStore.getState().patch({ occurredAt: ms });
  return (
    <View className="flex-1 bg-bg pt-2">
      <View className="h-12 flex-row items-center px-2">
        <View className="w-20" />
        <Text variant="headline" accessibilityRole="header" className="flex-1 text-center">
          Date
        </Text>
        <View className="w-20 items-end">
          <Button variant="barPrimary" size="sm" onPress={() => router.back()} accessibilityLabel="Done">
            <Text variant="headline">Done</Text>
          </Button>
        </View>
      </View>
      <View className="flex-row gap-2 px-4 pb-2 pt-1">
        <Button
          variant={key === today ? 'ghost' : 'secondary'}
          size="sm"
          className="flex-1"
          onPress={() => {
            haptic('light');
            set(withDateKey(occurredAt, toDateKey(Date.now())));
          }}
        >
          <Text variant="callout" className="font-medium">
            Today
          </Text>
        </Button>
        <Button
          variant={key === addDays(today, -1) ? 'ghost' : 'secondary'}
          size="sm"
          className="flex-1"
          onPress={() => {
            haptic('light');
            set(withDateKey(occurredAt, addDays(toDateKey(Date.now()), -1)));
          }}
        >
          <Text variant="callout" className="font-medium">
            Yesterday
          </Text>
        </Button>
      </View>
      <View className="items-center px-2">
        <DatePicker value={occurredAt} onChange={set} />
      </View>
    </View>
  );
}
