import { GoogleDriveProvider, type GoogleDriveOptions } from "./google-drive";
import { ICloudProvider } from "./icloud";
import type { SyncProvider, SyncProviderId } from "./types";

export * from "./google-drive";
export * from "./icloud";
export * from "./types";

let driveOptions: GoogleDriveOptions = { getAccessToken: () => null };

/** Registers how Google access tokens are obtained (done once the standalone build has an OAuth flow). */
export function configureGoogleDrive(options: GoogleDriveOptions): void {
  driveOptions = options;
}

/** The provider for a `sync_provider` setting value; null for 'none'. */
export function getSyncProvider(
  id: SyncProviderId | "none",
): SyncProvider | null {
  if (id === "icloud") return new ICloudProvider();
  if (id === "gdrive") return new GoogleDriveProvider(driveOptions);
  return null;
}
