import * as ImagePicker from "expo-image-picker";
import { Linking } from "react-native";

import { showToast } from "@studio/ui";

export type ReceiptSource = "camera" | "library";

export interface ReceiptImage {
  uri: string;
  width: number | null;
  height: number | null;
}

/** Opens the camera or the photo library. Returns null when cancelled, denied or unavailable (a toast says why). */
export async function pickReceipt(
  source: ReceiptSource,
): Promise<ReceiptImage | null> {
  try {
    let result: ImagePicker.ImagePickerResult;
    if (source === "camera") {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        showToast({
          message: "Camera access is off",
          haptic: "warning",
          ...(permission.canAskAgain
            ? {}
            : {
                actionLabel: "Settings",
                onAction: () => void Linking.openSettings(),
              }),
        });
        return null;
      }
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.8,
      });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
      });
    }
    const asset = result.canceled ? undefined : result.assets[0];
    return asset
      ? {
          uri: asset.uri,
          width: asset.width ?? null,
          height: asset.height ?? null,
        }
      : null;
  } catch {
    showToast({
      message:
        source === "camera" ? "Camera unavailable" : "Photos unavailable",
      haptic: "warning",
    });
    return null;
  }
}

export const RECEIPT_OPTIONS = [
  { value: "camera", label: "Take photo" },
  { value: "library", label: "Choose from library" },
] as const;
