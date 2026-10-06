import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SymbolIcon } from '@/components/app/symbol';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { useTokens } from '@studio/theme';

type HomeTopBarProps = { day: string; remaining: string };

/** One footnote line ("Friday 16 Oct · 15 days left") and the settings circle; no title. */
function HomeTopBar({ day, remaining }: HomeTopBarProps) {
  const router = useRouter();
  const { colors } = useTokens();
  return (
    <SafeAreaView edges={['top']} className="bg-bg">
      <View className="h-11 flex-row items-center justify-between px-4">
        <View className="flex-row items-center" accessible accessibilityRole="header" accessibilityLabel={`${day}, ${remaining}`}>
          <Text variant="footnote" className="font-semibold">
            {day}
          </Text>
          <View style={{ width: 3, height: 3, borderRadius: 2, marginHorizontal: 7, backgroundColor: colors.textTertiary }} />
          <Text variant="footnote" tone="secondary" className="font-medium">
            {remaining}
          </Text>
        </View>
        <Pressable
          role="button"
          accessibilityLabel="Settings"
          hitSlop={6}
          haptic="light"
          scale={0.92}
          onPress={() => router.push('/settings')}
          className="h-[34px] w-[34px] items-center justify-center rounded-full bg-surface"
          style={{ borderWidth: StyleSheet.hairlineWidth * 2, borderColor: colors.border }}
        >
          <SymbolIcon name="gearshape" size={17} color={colors.textSecondary} weight="medium" />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

export { HomeTopBar };
