import { View } from "react-native";

import { Text } from "@studio/ui";
import { useTokens } from "@studio/theme";

import { initials } from "./model";

/** Initials on a graphite circle (the Obsidian tile treatment). */
export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const { colors } = useTokens();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.fill,
        borderWidth: 1,
        borderColor: colors.border,
      }}
      className="items-center justify-center"
    >
      <Text
        variant={size >= 56 ? "title2" : "subhead"}
        className="font-semibold"
        style={{ color: colors.textSecondary }}
      >
        {initials(name)}
      </Text>
    </View>
  );
}
