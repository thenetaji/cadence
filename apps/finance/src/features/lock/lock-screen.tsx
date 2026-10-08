import { Image, View } from "react-native";

import { AppIcon } from "@studio/icons";
import { Button, Text } from "@studio/ui";
import { useTokens } from "@studio/theme";

type LockScreenProps = { onUnlock: () => void };

/** The app mark above one Unlock button; authentication is attempted on appear and the button retries. */
export function LockScreen({ onUnlock }: LockScreenProps) {
  const { colors } = useTokens();
  return (
    <View
      accessibilityViewIsModal
      className="flex-1 items-center justify-center gap-10 bg-bg"
    >
      <Image
        source={require("../../../assets/images/icon.png")}
        style={{ width: 48, height: 48, borderRadius: 11 }}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
      <Button size="lg" className="min-w-[200px]" onPress={onUnlock}>
        <AppIcon name="faceid" size={20} color={colors.onAccent} />
        <Text variant="headline">Unlock</Text>
      </Button>
    </View>
  );
}
