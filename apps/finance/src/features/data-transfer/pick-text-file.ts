import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";

/** Opens the document picker for a CSV and returns its text, or null when cancelled. */
export async function pickTextFile(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: [
      "text/csv",
      "text/comma-separated-values",
      "application/csv",
      "text/plain",
      "application/vnd.ms-excel",
    ],
    copyToCacheDirectory: true,
    multiple: false,
  });
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) return null;
  return asset.file ? asset.file.text() : new File(asset.uri).text();
}
