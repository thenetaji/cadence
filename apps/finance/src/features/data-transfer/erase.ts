import { Alert, Platform } from "react-native";

/**
 * Two-step confirmation for Erase all data: a native Alert asks, then asks again with the destructive
 * button. Web (QA only) uses window.confirm twice.
 */
export function confirmErase(onConfirm: () => void): void {
  if (Platform.OS === "web") {
    if (
      window.confirm("Erase all data?") &&
      window.confirm("Erase all data permanently?")
    )
      onConfirm();
    return;
  }
  Alert.alert("Erase all data", undefined, [
    { text: "Cancel", style: "cancel" },
    {
      text: "Continue",
      style: "destructive",
      onPress: () =>
        Alert.alert("Erase all data permanently", "This cannot be undone.", [
          { text: "Cancel", style: "cancel" },
          { text: "Erase all data", style: "destructive", onPress: onConfirm },
        ]),
    },
  ]);
}
