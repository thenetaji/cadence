import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { backupFileName } from "./paths";

/** Writes the backup to the cache directory as `<App>-backup-YYYY-MM-DD.json` and opens the share sheet. */
export async function shareBackupFile(
  json: string,
  date: Date | number = Date.now(),
  appName?: string,
): Promise<string> {
  const name = backupFileName(date, appName);
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(json);
  if (!(await Sharing.isAvailableAsync()))
    throw new Error("sharing_unavailable");
  await Sharing.shareAsync(file.uri, {
    mimeType: "application/json",
    UTI: "public.json",
    dialogTitle: "Save backup",
  });
  return name;
}

/** Opens the document picker for a backup and returns its text, or null when cancelled. */
export async function pickBackupFile(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/json", "text/plain", "application/octet-stream"],
    copyToCacheDirectory: true,
    multiple: false,
  });
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) return null;
  return asset.file ? asset.file.text() : new File(asset.uri).text();
}
