import type { StyleProp, ViewStyle } from "react-native";

import { AppIcon } from "@studio/icons";
import { Pressable } from "../ui/pressable";
import { Text } from "../ui/text";
import { pressScale, shadows, useTokens } from "@studio/theme";

type FloatingAddButtonProps = {
  onPress: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  /** Screen-reader label; apps say what is being added. */
  accessibilityLabel?: string;
};

/** Extended pill: plus and "Add". */
function FloatingAddButton({
  onPress,
  onLongPress,
  style,
  accessibilityLabel = "Add",
}: FloatingAddButtonProps) {
  const { colors } = useTokens();
  return (
    <Pressable
      role="button"
      accessibilityLabel={accessibilityLabel}
      haptic="light"
      scale={pressScale.fab}
      holdScale={1.07}
      holdDelay={200}
      onPress={onPress}
      onLongPress={onLongPress}
      className="h-[52px] flex-row items-center gap-2 rounded-[26px] bg-accent pl-4 pr-5"
      style={[shadows.fab, style]}
    >
      <AppIcon name="plus" size={17} color={colors.onAccent} />
      <Text variant="headline" style={{ color: colors.onAccent }}>
        Add
      </Text>
    </Pressable>
  );
}

export { FloatingAddButton };
export type { FloatingAddButtonProps };
