import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

/** Writes `contents` to the cache directory and opens the share sheet for it. */
export async function shareTextFile(
  name: string,
  contents: string,
): Promise<void> {
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(contents);
  if (!(await Sharing.isAvailableAsync()))
    throw new Error("sharing_unavailable");
  await Sharing.shareAsync(file.uri, {
    mimeType: "text/csv",
    UTI: "public.comma-separated-values-text",
    dialogTitle: "Export CSV",
  });
}
