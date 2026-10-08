import * as React from "react";
import { View, type LayoutChangeEvent } from "react-native";

import Animated from "react-native-reanimated";

import { AppIcon } from "@studio/icons";
import { Button } from "../ui/button";
import { Text } from "../ui/text";
import { fadeIn, Float } from "@studio/motion";
import { useTokens } from "@studio/theme";

type EmptyStateProps = {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: string;
};

const LIFT = 0.1;

/**
 * Centred in the space below the last fixed element, lifted 10% so it sits above optical centre.
 * The action is always a secondary button; labels are verb + object.
 */
function EmptyState({
  message,
  actionLabel,
  onAction,
  icon = "tray",
}: EmptyStateProps) {
  const { colors } = useTokens();
  const [height, setHeight] = React.useState(0);
  const onLayout = React.useCallback(
    (event: LayoutChangeEvent) => setHeight(event.nativeEvent.layout.height),
    [],
  );
  return (
    <View
      onLayout={onLayout}
      className="min-h-[200px] flex-1 items-center justify-center gap-4 px-6"
      style={{ paddingBottom: height * LIFT * 2 }}
    >
      <Float>
        <Animated.View
          entering={fadeIn(0)}
          className="size-14 items-center justify-center rounded-full bg-fill"
        >
          <AppIcon name={icon} size={24} color={colors.textTertiary} />
        </Animated.View>
      </Float>
      <Animated.View entering={fadeIn(120)} className="items-center gap-4">
        <Text variant="callout" tone="secondary" className="text-center">
          {message}
        </Text>
        {actionLabel && onAction ? (
          <Button variant="secondary" onPress={onAction}>
            {actionLabel}
          </Button>
        ) : null}
      </Animated.View>
    </View>
  );
}

export { EmptyState };
export type { EmptyStateProps };
