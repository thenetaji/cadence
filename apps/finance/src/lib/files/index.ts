import { shareBackupFile as shareBackup } from "@studio/data/files";

import { APP_NAME } from "@/constants/app";

export {
  copyIntoAttachments,
  deleteAttachmentFile,
  pickBackupFile,
} from "@studio/data/files";
export type { PickedImage } from "@studio/data/files";
export * from "./paths";

/** Writes the backup as `<App>-backup-YYYY-MM-DD.json` and opens the share sheet. */
export const shareBackupFile = (
  json: string,
  date: Date | number = Date.now(),
): Promise<string> => shareBackup(json, date, APP_NAME);
