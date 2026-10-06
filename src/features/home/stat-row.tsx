import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Pressable } from '@/components/ui/pressable';
import { Text, type TextTone } from '@/components/ui/text';
import { AnimatedNumber } from '@/motion/animated-number';
import { useTokens } from '@/theme/use-tokens';

type StatProps = { label: string; value: string; tone?: TextTone; divider?: boolean; onPress?: () => void };

function Stat({ label, value, tone, divider, onPress }: StatProps) {
  const { colors } = useTokens();
  const body = (
    <View className="px-4" style={divider ? { borderLeftWidth: StyleSheet.hairlineWidth * 2, borderLeftColor: colors.separator } : null}>
      <Text variant="caption" tone="secondary" numberOfLines={1}>
        {label}
      </Text>
      <AnimatedNumber value={value} variant="headline" tone={tone} fit align="left" intro className="mt-1 font-bold tracking-[-0.4px]" />
    </View>
  );
  if (!onPress) return <View className="flex-1">{body}</View>;
  return (
    <Pressable role="button" accessibilityLabel={`${label}, ${value}`} scale={0.97} onPress={onPress} className="flex-1">
      {body}
    </Pressable>
  );
}

type StatRowProps = { earned: string; perDay: string; balance: string; balanceNegative: boolean };

/** One card, three columns split by hairlines: Earned, Daily avg, Balance. */
function StatRow({ earned, perDay, balance, balanceNegative }: StatRowProps) {
  const router = useRouter();
  return (
    <Card className="flex-row rounded-[20px] px-0 py-3.5">
      <Stat label="Earned" value={earned} tone="income" />
      <Stat label="Daily avg" value={perDay} divider />
      <Stat label="Balance" value={balance} tone={balanceNegative ? 'expense' : 'default'} divider onPress={() => router.push('/accounts')} />
    </Card>
  );
}

export { StatRow };
