import { Platform, type ViewStyle } from "react-native";

/** CSS gradient layers as a View style: native uses `experimental_backgroundImage`, react-native-web plain CSS. */
export function gradientStyle(css: string): ViewStyle {
  return (
    Platform.OS === "web"
      ? { backgroundImage: css }
      : { experimental_backgroundImage: css }
  ) as ViewStyle;
}
