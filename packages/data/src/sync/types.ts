export type SyncProviderId = "icloud" | "gdrive";

export type UnavailableReason =
  /** iCloud Documents needs the iCloud entitlement, which needs a paid Apple developer account. */
  | "needs-paid-developer-account"
  /** Google OAuth redirects need our own bundle id and URL scheme, so Expo Go cannot sign in. */
  | "needs-standalone-build"
  /** The provider can run but has no way to get a credential yet. */
  | "not-configured";

export type SyncStatus =
  | { status: "available" }
  | { status: "unavailable"; reason: UnavailableReason };

/** Where backups are stored remotely: one backup document per provider. */
export interface SyncProvider {
  readonly id: SyncProviderId;
  status(): SyncStatus;
  /** Starts whatever sign-in the provider needs. Rejects when `status()` is unavailable. */
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  /** Creates or replaces the remote backup. */
  upload(backupJson: string): Promise<void>;
  /** The remote backup text, or null when none exists. */
  download(): Promise<string | null>;
  /** Epoch ms the remote backup was last written, or null when none exists. */
  lastRemoteModified(): Promise<number | null>;
}

export class SyncError extends Error {
  readonly code:
    | "unavailable"
    | "request_failed"
    | "invalid_remote"
    | "not_connected";
  readonly status?: number;
  constructor(code: SyncError["code"], message?: string, status?: number) {
    super(message ?? code);
    this.name = "SyncError";
    this.code = code;
    this.status = status;
  }
}
