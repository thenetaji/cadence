/** @jest-environment node */
import { seedDemoData } from "@/db/dev-seed";
import { exportBackup, serializeBackup } from "@/db/repos/backup";
import { getSetting, setSetting } from "@/db/repos/settings";
import { createTransaction } from "@/db/repos/transactions";
import { listAccounts } from "@/db/repos/accounts";
import { categoryId, createTestDb, makeAccounts, at } from "@/db/test-helpers";
import {
  GoogleDriveProvider,
  ICloudProvider,
  SyncError,
  getSyncProvider,
  syncNow,
  type SyncProvider,
} from "./index";

type Call = { url: string; init?: RequestInit };

function mockFetch(
  handler: (call: Call) => { status?: number; json?: unknown; text?: string },
) {
  const calls: Call[] = [];
  const impl = jest.fn(async (url: string, init?: RequestInit) => {
    const call = { url: String(url), init };
    calls.push(call);
    const r = handler(call);
    return {
      ok: (r.status ?? 200) < 400,
      status: r.status ?? 200,
      json: async () => r.json,
      text: async () => r.text ?? JSON.stringify(r.json),
    } as unknown as Response;
  });
  return { impl, calls };
}

const drive = (
  fetchImpl: typeof fetch | ((u: string, i?: RequestInit) => Promise<Response>),
  token: string | null = "tok",
) =>
  new GoogleDriveProvider({
    getAccessToken: () => token,
    fetch: fetchImpl as never,
    isExpoGo: false,
  });

describe("ICloudProvider", () => {
  it("is unavailable until there is a paid developer account", async () => {
    const p = new ICloudProvider();
    expect(p.status()).toEqual({
      status: "unavailable",
      reason: "needs-paid-developer-account",
    });
    await expect(p.connect()).rejects.toMatchObject({ code: "unavailable" });
    await expect(p.upload("{}")).rejects.toBeInstanceOf(SyncError);
    await expect(p.download()).rejects.toBeInstanceOf(SyncError);
    await expect(p.lastRemoteModified()).rejects.toBeInstanceOf(SyncError);
    await expect(p.disconnect()).resolves.toBeUndefined();
  });
});

describe("GoogleDriveProvider", () => {
  it("reports needs-standalone-build inside Expo Go and refuses to call the API", async () => {
    const { impl } = mockFetch(() => ({ json: {} }));
    const p = new GoogleDriveProvider({
      getAccessToken: () => "tok",
      fetch: impl as never,
      isExpoGo: true,
    });
    expect(p.status()).toEqual({
      status: "unavailable",
      reason: "needs-standalone-build",
    });
    await expect(p.download()).rejects.toMatchObject({ code: "unavailable" });
    await expect(p.connect()).rejects.toMatchObject({ code: "unavailable" });
    expect(impl).not.toHaveBeenCalled();
    expect(drive(impl as never).status()).toEqual({ status: "available" });
  });

  it("creates the backup in appDataFolder with a multipart upload when none exists", async () => {
    const { impl, calls } = mockFetch(({ url }) =>
      url.includes("/upload/")
        ? { json: { id: "f1" } }
        : { json: { files: [] } },
    );
    await drive(impl as never).upload('{"hello":1}');
    expect(calls).toHaveLength(2);
    const list = new URL(calls[0]!.url);
    expect(list.pathname).toBe("/drive/v3/files");
    expect(list.searchParams.get("spaces")).toBe("appDataFolder");
    expect(list.searchParams.get("q")).toBe(
      "name = 'backup.json' and trashed = false",
    );
    const create = calls[1]!;
    expect(create.init?.method).toBe("POST");
    expect(create.url).toContain(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
    );
    const headers = create.init?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer tok");
    expect(headers["Content-Type"]).toMatch(/^multipart\/related; boundary=/);
    const body = String(create.init?.body);
    expect(body).toContain('"parents":["appDataFolder"]');
    expect(body).toContain('"name":"backup.json"');
    expect(body).toContain('{"hello":1}');
  });

  it("updates the existing file in place with a media upload", async () => {
    const { impl, calls } = mockFetch(({ url }) =>
      url.includes("/upload/")
        ? { json: { id: "f1" } }
        : {
            json: {
              files: [{ id: "f1", modifiedTime: "2026-10-05T10:00:00.000Z" }],
            },
          },
    );
    await drive(impl as never).upload("NEW");
    const update = calls[1]!;
    expect(update.init?.method).toBe("PATCH");
    expect(update.url).toBe(
      "https://www.googleapis.com/upload/drive/v3/files/f1?uploadType=media",
    );
    expect(update.init?.body).toBe("NEW");
  });

  it("downloads the file content, or null when there is no backup", async () => {
    const found = mockFetch(({ url }) =>
      url.includes("alt=media")
        ? { text: '{"a":1}' }
        : { json: { files: [{ id: "f9" }] } },
    );
    await expect(drive(found.impl as never).download()).resolves.toBe(
      '{"a":1}',
    );
    expect(found.calls[1]!.url).toBe(
      "https://www.googleapis.com/drive/v3/files/f9?alt=media",
    );
    const none = mockFetch(() => ({ json: { files: [] } }));
    await expect(drive(none.impl as never).download()).resolves.toBeNull();
  });

  it("reads the remote modified time", async () => {
    const { impl } = mockFetch(() => ({
      json: { files: [{ id: "f1", modifiedTime: "2026-10-05T10:00:00.000Z" }] },
    }));
    await expect(drive(impl as never).lastRemoteModified()).resolves.toBe(
      Date.parse("2026-10-05T10:00:00.000Z"),
    );
    const none = mockFetch(() => ({ json: {} }));
    await expect(
      drive(none.impl as never).lastRemoteModified(),
    ).resolves.toBeNull();
  });

  it("fails clearly when signed out or when Drive errors", async () => {
    const { impl } = mockFetch(() => ({ json: {} }));
    await expect(drive(impl as never, null).download()).rejects.toMatchObject({
      code: "not_connected",
    });
    expect(impl).not.toHaveBeenCalled();
    const denied = mockFetch(() => ({ status: 401, json: {} }));
    await expect(drive(denied.impl as never).download()).rejects.toMatchObject({
      code: "request_failed",
      status: 401,
    });
  });

  it("delegates connect and disconnect to the injected flow", async () => {
    const connect = jest.fn(async () => {});
    const disconnect = jest.fn(async () => {});
    const p = new GoogleDriveProvider({
      getAccessToken: () => "t",
      connect,
      disconnect,
      isExpoGo: false,
    });
    await p.connect();
    await p.disconnect();
    expect(connect).toHaveBeenCalled();
    expect(disconnect).toHaveBeenCalled();
    expect(getSyncProvider("none")).toBeNull();
    expect(getSyncProvider("icloud")?.id).toBe("icloud");
    expect(getSyncProvider("gdrive")?.id).toBe("gdrive");
  });
});

/** An in-memory provider that stores the document as text. */
function memoryProvider(
  initial: string | null = null,
): SyncProvider & { text: string | null; uploads: number } {
  const state = { text: initial, uploads: 0 };
  return {
    id: "gdrive",
    status: () => ({ status: "available" }),
    connect: async () => {},
    disconnect: async () => {},
    upload: async (json: string) => {
      state.text = json;
      state.uploads += 1;
    },
    download: async () => state.text,
    lastRemoteModified: async () => null,
    get text() {
      return state.text;
    },
    get uploads() {
      return state.uploads;
    },
  };
}

// Accounts are stamped with the real clock, so test times sit safely after it.
const T = Date.now() + 3_600_000;

const seededDevice = (now: number) => {
  const db = createTestDb();
  const { cash } = makeAccounts(db);
  createTransaction(
    db,
    {
      kind: "expense",
      amount: 100,
      accountId: cash.id,
      categoryId: categoryId(db, "Groceries"),
      occurredAt: at("2026-10-01"),
    },
    now,
  );
  return { db, cash };
};

describe("syncNow", () => {
  it("does nothing while the provider is unavailable", async () => {
    const db = createTestDb();
    expect(await syncNow(db, new ICloudProvider())).toEqual({
      action: "unavailable",
      reason: "needs-paid-developer-account",
    });
    const gd = new GoogleDriveProvider({
      getAccessToken: () => "t",
      isExpoGo: true,
    });
    expect(await syncNow(db, gd)).toEqual({
      action: "unavailable",
      reason: "needs-standalone-build",
    });
  });

  it("uploads when there is no remote backup and records last_backup_at", async () => {
    const { db } = seededDevice(T + 1000);
    const provider = memoryProvider();
    expect(await syncNow(db, provider, { now: T + 5000 })).toEqual({
      action: "uploaded",
    });
    expect(getSetting(db, "last_backup_at")).toBe(T + 5000);
    expect(JSON.parse(provider.text ?? "{}").exportedAt).toBe(T + 5000);
    // Nothing changed since: no further traffic.
    expect(await syncNow(db, provider, { now: T + 6000 })).toEqual({
      action: "noop",
    });
    expect(provider.uploads).toBe(1);
  });

  it("uploads local changes made after the last sync", async () => {
    const { db, cash } = seededDevice(T + 1000);
    const provider = memoryProvider();
    await syncNow(db, provider, { now: T + 5000 });
    createTransaction(
      db,
      {
        kind: "expense",
        amount: 5,
        accountId: cash.id,
        categoryId: categoryId(db, "Groceries"),
        occurredAt: at("2026-10-02"),
      },
      T + 7000,
    );
    expect(await syncNow(db, provider, { now: T + 8000 })).toEqual({
      action: "uploaded",
    });
    expect(JSON.parse(provider.text ?? "{}").tables.transactions).toHaveLength(
      2,
    );
  });

  it("downloads a remote backup into a fresh device without calling it a conflict", async () => {
    const source = seededDevice(T + 1000).db;
    const remote = serializeBackup(exportBackup(source, { now: T + 9000 }));
    const fresh = createTestDb();
    const provider = memoryProvider(remote);
    expect(await syncNow(fresh, provider, { now: T + 10_000 })).toEqual({
      action: "downloaded",
    });
    expect(listAccounts(fresh)).toHaveLength(3);
    expect(getSetting(fresh, "last_backup_at")).toBe(T + 10_000);
    expect(provider.uploads).toBe(0);
  });

  it("is last-write-wins when both sides changed, with a conflict note", async () => {
    // Local changed at 7000, remote exported at 9000: remote wins.
    const local = seededDevice(T + 7000).db;
    setSetting(local, "last_backup_at", T + 2000);
    const remote = serializeBackup(
      exportBackup(seededDevice(T + 1000).db, { now: T + 9000 }),
    );
    const outcome = await syncNow(local, memoryProvider(remote), {
      now: T + 10_000,
    });
    expect(outcome).toMatchObject({ action: "downloaded" });
    expect("conflict" in outcome && outcome.conflict).toMatch(
      /replaced by a newer backup/,
    );

    // Local changed at 9500, remote exported at 9000: local wins.
    const local2 = seededDevice(T + 9500).db;
    setSetting(local2, "last_backup_at", T + 2000);
    const provider = memoryProvider(remote);
    const outcome2 = await syncNow(local2, provider, { now: T + 10_000 });
    expect(outcome2).toMatchObject({ action: "uploaded" });
    expect("conflict" in outcome2 && outcome2.conflict).toMatch(
      /newer backup elsewhere was replaced/,
    );
    expect(JSON.parse(provider.text ?? "{}").exportedAt).toBe(T + 10_000);
  });

  it("refuses an invalid remote document without touching local data", async () => {
    const { db } = seededDevice(T + 1000);
    await expect(
      syncNow(db, memoryProvider('{"nope":true}'), { now: T + 5000 }),
    ).rejects.toMatchObject({ code: "invalid_remote" });
    expect(listAccounts(db)).toHaveLength(3);
  });

  it("round-trips demo data between two devices", async () => {
    const a = createTestDb();
    seedDemoData(a, Date.UTC(2026, 9, 1));
    const provider = memoryProvider();
    await syncNow(a, provider, { now: T });
    const b = createTestDb();
    expect(await syncNow(b, provider, { now: T + 1000 })).toEqual({
      action: "downloaded",
    });
    const tables = (db: typeof a) => exportBackup(db, { now: 0 }).tables;
    expect(tables(b).transactions).toEqual(tables(a).transactions);
    expect(tables(b).accounts).toEqual(tables(a).accounts);
    expect(tables(b).transactions!.length).toBeGreaterThan(100);
  });
});
