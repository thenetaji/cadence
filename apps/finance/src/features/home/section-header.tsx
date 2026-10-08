import { View } from "react-native";

import { SymbolIcon, Pressable, Text } from "@studio/ui";
import { pressOpacity, useTokens } from "@studio/theme";

type HomeSectionHeaderProps = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
};

/** 15 pt / 600 title (not small caps) with a brass "All ›" link. */
function HomeSectionHeader({
  title,
  actionLabel,
  onAction,
}: HomeSectionHeaderProps) {
  const { colors } = useTokens();
  return (
    <View className="flex-row items-baseline justify-between px-0.5 pb-2.5">
      <Text
        variant="subhead"
        accessibilityRole="header"
        className="font-semibold tracking-[-0.15px]"
      >
        {title}
      </Text>
      {actionLabel ? (
        <Pressable
          role="button"
          scale={1}
          dimTo={pressOpacity.text}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={onAction}
        >
          <View className="flex-row items-center gap-0.5">
            <Text variant="footnote" tone="accent" className="font-semibold">
              {actionLabel}
            </Text>
            <SymbolIcon
              name="chevron.right"
              size={11}
              color={colors.accentText}
              weight="bold"
            />
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

export { HomeSectionHeader };
