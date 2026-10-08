import {
  exportBackup,
  localModifiedAt,
  restoreBackup,
  serializeBackup,
  validateBackup,
} from "@/db/repos/backup";
import { getSetting, setSetting } from "@/db/repos/settings";
import type { Db } from "@/db/types";
import {
  SyncError,
  type SyncProvider,
  type UnavailableReason,
} from "@studio/data/sync";

export type SyncOutcome =
  | { action: "unavailable"; reason: UnavailableReason }
  | { action: "noop" }
  | { action: "uploaded"; conflict?: string }
  | { action: "downloaded"; conflict?: string };

export interface SyncOptions {
  now?: number;
  appVersion?: string;
}

/**
 * Last-write-wins sync of one backup document.
 *
 * "Local changed" means a row was written after the last sync (`last_backup_at`); "remote changed"
 * means the remote backup's `exportedAt` is after it. When both changed, the side with the newer
 * timestamp wins (`exportedAt` remotely, the newest row `updatedAt` locally) and the outcome carries a
 * `conflict` note describing what was overwritten. Deletions are not tracked, so a delete on one side
 * only travels when that side also wins. Does nothing while the provider reports unavailable.
 */
export async function syncNow(
  db: Db,
  provider: SyncProvider,
  options: SyncOptions = {},
): Promise<SyncOutcome> {
  const status = provider.status();
  if (status.status === "unavailable")
    return { action: "unavailable", reason: status.reason };
  const now = options.now ?? Date.now();
  const lastSync = getSetting(db, "last_backup_at") ?? 0;

  const remoteText = await provider.download();
  const upload = async (conflict?: string): Promise<SyncOutcome> => {
    await provider.upload(
      serializeBackup(
        exportBackup(db, { now, appVersion: options.appVersion }),
      ),
    );
    setSetting(db, "last_backup_at", now);
    return conflict ? { action: "uploaded", conflict } : { action: "uploaded" };
  };
  if (remoteText === null) return upload();

  const remote = validateBackup(remoteText);
  if (!remote.ok) throw new SyncError("invalid_remote", remote.message);
  const remoteAt = remote.backup.exportedAt;
  const localAt = localModifiedAt(db);
  const remoteChanged = remoteAt > lastSync;
  const localChanged = localAt > lastSync;

  const download = (conflict?: string): SyncOutcome => {
    restoreBackup(db, remote.backup);
    setSetting(db, "last_backup_at", now);
    return conflict
      ? { action: "downloaded", conflict }
      : { action: "downloaded" };
  };

  if (!remoteChanged && !localChanged) return { action: "noop" };
  if (localChanged && !remoteChanged) return upload();
  if (remoteChanged && !localChanged) return download();
  // Both sides changed since the last sync.
  if (remoteAt > localAt)
    return download(
      "Changes on this device since the last sync were replaced by a newer backup.",
    );
  return upload(
    "A newer backup elsewhere was replaced by changes made on this device.",
  );
}
