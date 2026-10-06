import { View } from 'react-native';

import { SymbolIcon } from '@/components/app/symbol';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useTokens } from '@/theme/use-tokens';

type LockScreenProps = { onUnlock: () => void };

/** The app mark above one Unlock button; authentication is attempted on appear and the button retries. */
export function LockScreen({ onUnlock }: LockScreenProps) {
  const { colors } = useTokens();
  return (
    <View accessibilityViewIsModal className="flex-1 items-center justify-center gap-10 bg-bg">
      <View className="h-12 w-12 items-center justify-center rounded-[12px] bg-accent" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <SymbolIcon name="lock.fill" size={22} color={colors.onAccent} weight="semibold" />
      </View>
      <Button size="lg" className="min-w-[200px]" onPress={onUnlock}>
        <SymbolIcon name="faceid" size={20} color={colors.onAccent} />
        <Text variant="headline">Unlock</Text>
      </Button>
    </View>
  );
}
