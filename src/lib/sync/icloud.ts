import { SyncError, type SyncProvider, type SyncStatus } from './types';

/**
 * iCloud backup provider, stubbed until we can ship a real build.
 *
 * What it will need (native capability, not available in Expo Go):
 * - A paid Apple Developer Program membership, so the app id can carry the iCloud capability.
 * - The iCloud entitlement for iCloud Documents (`com.apple.developer.icloud-container-identifiers`
 *   and `com.apple.developer.ubiquity-container-identifiers`, container `iCloud.<bundle id>`), enabled
 *   through an Expo config plugin and an EAS development or production build.
 * - A native module that reads and writes one file in the ubiquity container's `Documents` folder
 *   (NSFileCoordinator / `FileManager.url(forUbiquityContainerIdentifier:)`), or CloudKit private
 *   database records holding the backup JSON as a CKAsset. Either works with `upload`, `download` and
 *   `lastRemoteModified` below; the modification time comes from the file's or record's modified date.
 */
export class ICloudProvider implements SyncProvider {
  readonly id = 'icloud' as const;

  status(): SyncStatus {
    return { status: 'unavailable', reason: 'needs-paid-developer-account' };
  }

  private fail(): never {
    throw new SyncError('unavailable', 'iCloud sync needs a paid developer account');
  }

  async connect(): Promise<void> {
    this.fail();
  }

  async disconnect(): Promise<void> {}

  async upload(_backupJson: string): Promise<void> {
    this.fail();
  }

  async download(): Promise<string | null> {
    return this.fail();
  }

  async lastRemoteModified(): Promise<number | null> {
    return this.fail();
  }
}
