/** Finance's bindings of the shared file helpers: backups are named after the app. */
import { backupFileName as sharedBackupFileName } from '@studio/data/files';

import { APP_NAME } from '@/constants/app';

export { imageExtension, isInsideDirectory } from '@studio/data/files';

export function backupFileName(date: Date | number = Date.now()): string {
  return sharedBackupFileName(date, APP_NAME);
}
