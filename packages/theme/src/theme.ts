import { Appearance, Platform } from "react-native";
import { Uniwind } from "uniwind";

export type ThemePreference = "system" | "light" | "dark";

export function applyThemePreference(preference: ThemePreference): void {
  Uniwind.setTheme(preference);
  if (Platform.OS === "web") return;
  Appearance.setColorScheme(
    preference === "system" ? "unspecified" : preference,
  );
}

export function followWebColorScheme(): void {
  if (
    Platform.OS !== "web" ||
    typeof window === "undefined" ||
    !window.matchMedia
  )
    return;
  const query = window.matchMedia("(prefers-color-scheme: dark)");
  const sync = () => Uniwind.setTheme(query.matches ? "dark" : "light");
  sync();
  query.addEventListener("change", sync);
}
