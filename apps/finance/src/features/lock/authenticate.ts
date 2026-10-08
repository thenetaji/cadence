import * as LocalAuthentication from "expo-local-authentication";
import { Platform } from "react-native";

/** Errors that mean the device cannot authenticate at all; locking would shut the user out. */
const UNAVAILABLE = new Set([
  "not_enrolled",
  "not_available",
  "passcode_not_set",
]);

export type AuthResult = "success" | "failed" | "unavailable";

/** Face ID with the device passcode as fallback. Web (QA only) always succeeds. */
export async function authenticate(prompt = "Unlock"): Promise<AuthResult> {
  if (Platform.OS === "web") return "success";
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: prompt,
      disableDeviceFallback: false,
      cancelLabel: "Cancel",
    });
    if (result.success) return "success";
    return UNAVAILABLE.has(result.error) ? "unavailable" : "failed";
  } catch {
    return "failed";
  }
}
