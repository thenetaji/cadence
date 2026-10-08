import { SymbolView } from "expo-symbols";
import { Platform } from "react-native";
import { SvgXml } from "react-native-svg";

import { useIconPrefs } from "./prefs";
import { conceptFor, iconXml, sfSymbolFor } from "./registry";
import type { IconStyle } from "./types";

type AppIconProps = {
  /** Concept id, SF Symbol name (legacy rows) or old fallback name. Unknown names draw a tag. */
  name: string;
  size?: number;
  color: string;
  /** Recolours the duotone layer (Phosphor duotone, Solar). */
  secondaryColor?: string;
  secondaryOpacity?: number;
  /** Force a style (previews). Defaults to the user's chosen style. */
  iconStyle?: IconStyle;
  /** Ignored; accepted so SF-era call sites keep compiling. */
  weight?: string;
  accessibilityLabel?: string;
};

function AppIcon({
  name,
  size = 20,
  color,
  secondaryColor,
  secondaryOpacity,
  iconStyle,
  accessibilityLabel,
}: AppIconProps) {
  const chosen = useIconPrefs((s) => s.style);
  const style = iconStyle ?? chosen;
  const hidden = accessibilityLabel === undefined;
  const a11y = {
    accessibilityLabel,
    accessibilityElementsHidden: hidden,
    importantForAccessibility: hidden
      ? ("no-hide-descendants" as const)
      : ("auto" as const),
  };
  if (style === "sf" && Platform.OS === "ios") {
    return (
      <SymbolView
        name={
          sfSymbolFor(name) as React.ComponentProps<typeof SymbolView>["name"]
        }
        size={size}
        tintColor={color}
        type="monochrome"
        weight="semibold"
        resizeMode="scaleAspectFit"
        style={{ width: size, height: size }}
        {...a11y}
      />
    );
  }
  return (
    <SvgXml
      xml={iconXml(style, conceptFor(name), secondaryColor, secondaryOpacity)}
      width={size}
      height={size}
      color={color}
      {...a11y}
    />
  );
}

export { AppIcon };
export type { AppIconProps };
