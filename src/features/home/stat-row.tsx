import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Pressable } from '@/components/ui/pressable';
import { Text, type TextTone } from '@/components/ui/text';

type Stat = { label: string; value: string; tone?: TextTone; onPress?: () => void };

function Tile({ label, value, tone, onPress }: Stat) {
  const body = (
    <Card className="rounded-2xl px-3 py-3">
      <Text variant="footnote" tone="secondary" numberOfLines={1}>
        {label}
      </Text>
      <Text variant="headline" tone={tone} numeric numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
        {value}
      </Text>
    </Card>
  );
  if (!onPress) return <View className="flex-1">{body}</View>;
  return (
    <Pressable role="button" accessibilityLabel={`${label}, ${value}`} scale={0.97} onPress={onPress} className="flex-1">
      {body}
    </Pressable>
  );
}

type StatRowProps = { earned: string; balance: string; perDay: string; balanceNegative: boolean };

/** Earned, Balance, Per day: three equal tiles. */
function StatRow({ earned, balance, perDay, balanceNegative }: StatRowProps) {
  const router = useRouter();
  return (
    <View className="flex-row gap-3 px-4">
      <Tile label="Earned" value={earned} tone="income" />
      <Tile label="Balance" value={balance} tone={balanceNegative ? 'expense' : 'default'} onPress={() => router.push('/accounts')} />
      <Tile label="Per day" value={perDay} />
    </View>
  );
}

export { StatRow };
