import Constants, { ExecutionEnvironment } from 'expo-constants';
import { SyncError, type SyncProvider, type SyncStatus } from './types';

const API = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
export const DRIVE_BACKUP_NAME = 'Farthing-backup.json';
/** The OAuth scope that gives access to this app's private appDataFolder only. */
export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface GoogleDriveOptions {
  /** Returns a current OAuth access token for `DRIVE_SCOPE`, or null when signed out. */
  getAccessToken: () => Promise<string | null> | string | null;
  /** Starts the OAuth flow; only possible in a standalone build. Optional. */
  connect?: () => Promise<void>;
  disconnect?: () => Promise<void>;
  fetch?: FetchLike;
  /** Overrides detection of Expo Go (tests). */
  isExpoGo?: boolean;
  fileName?: string;
}

export const runningInExpoGo = (): boolean => Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

interface DriveFile {
  id: string;
  modifiedTime?: string;
}

/**
 * One backup file in the Drive `appDataFolder` (invisible to the user's Drive UI), through the v3 REST API.
 * The access token is injected, so the OAuth flow lives elsewhere; inside Expo Go `status()` reports
 * 'needs-standalone-build' because Google's redirect needs our own bundle id and URL scheme.
 */
export class GoogleDriveProvider implements SyncProvider {
  readonly id = 'gdrive' as const;
  private readonly fetchImpl: FetchLike;
  private readonly name: string;
  private readonly expoGo: boolean;
  private fileId: string | null = null;

  constructor(private readonly options: GoogleDriveOptions) {
    this.fetchImpl = options.fetch ?? ((input, init) => fetch(input, init));
    this.name = options.fileName ?? DRIVE_BACKUP_NAME;
    this.expoGo = options.isExpoGo ?? runningInExpoGo();
  }

  status(): SyncStatus {
    if (this.expoGo) return { status: 'unavailable', reason: 'needs-standalone-build' };
    return { status: 'available' };
  }

  async connect(): Promise<void> {
    this.assertAvailable();
    if (!this.options.connect) throw new SyncError('not_connected', 'no sign-in flow configured');
    await this.options.connect();
  }

  async disconnect(): Promise<void> {
    this.fileId = null;
    await this.options.disconnect?.();
  }

  async upload(backupJson: string): Promise<void> {
    const existing = await this.find();
    if (existing) {
      const res = await this.request(`${UPLOAD}/files/${existing.id}?uploadType=media`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: backupJson,
      });
      this.fileId = ((await res.json()) as DriveFile).id ?? existing.id;
      return;
    }
    const boundary = `farthing-${Date.now().toString(36)}`;
    const metadata = JSON.stringify({ name: this.name, parents: ['appDataFolder'], mimeType: 'application/json' });
    const body =
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
      `--${boundary}\r\nContent-Type: application/json\r\n\r\n${backupJson}\r\n--${boundary}--`;
    const res = await this.request(`${UPLOAD}/files?uploadType=multipart&fields=id,modifiedTime`, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
    });
    this.fileId = ((await res.json()) as DriveFile).id;
  }

  async download(): Promise<string | null> {
    const file = await this.find();
    if (!file) return null;
    const res = await this.request(`${API}/files/${file.id}?alt=media`);
    return res.text();
  }

  async lastRemoteModified(): Promise<number | null> {
    const file = await this.find();
    if (!file?.modifiedTime) return null;
    const ms = Date.parse(file.modifiedTime);
    return Number.isNaN(ms) ? null : ms;
  }

  private assertAvailable(): void {
    const status = this.status();
    if (status.status === 'unavailable') throw new SyncError('unavailable', status.reason);
  }

  /** The backup file in appDataFolder, newest if several exist. */
  private async find(): Promise<DriveFile | null> {
    const query = `name = '${this.name.replace(/'/g, "\\'")}' and trashed = false`;
    const url =
      `${API}/files?spaces=appDataFolder&orderBy=modifiedTime desc&pageSize=1` +
      `&fields=${encodeURIComponent('files(id,modifiedTime)')}&q=${encodeURIComponent(query)}`;
    const res = await this.request(url);
    const data = (await res.json()) as { files?: DriveFile[] };
    const file = data.files?.[0] ?? null;
    this.fileId = file?.id ?? null;
    return file;
  }

  private async request(url: string, init: RequestInit = {}): Promise<Response> {
    this.assertAvailable();
    const token = await this.options.getAccessToken();
    if (!token) throw new SyncError('not_connected', 'signed out of Google');
    const res = await this.fetchImpl(url, { ...init, headers: { ...(init.headers as Record<string, string> | undefined), Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new SyncError('request_failed', `Drive responded ${res.status}`, res.status);
    return res;
  }
}
