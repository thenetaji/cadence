/** Pure helpers shared by the native and web file code. */
/** `<appName>-backup-YYYY-MM-DD.json`; each app passes its own name. */
export function backupFileName(
  date: Date | number = Date.now(),
  appName = "App",
): string {
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${appName}-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
}

/** File extension including the dot, lower-cased; '.jpg' when the source has none. */
export function imageExtension(uri: string): string {
  const clean = uri.split(/[?#]/)[0] ?? "";
  const match = /\.([a-z0-9]{2,5})$/i.exec(clean);
  return match ? `.${(match[1] as string).toLowerCase()}` : ".jpg";
}

/** True when `uri` points inside `directoryUri` (so it is safe to delete as an app-owned copy). */
export function isInsideDirectory(uri: string, directoryUri: string): boolean {
  const dir = directoryUri.endsWith("/") ? directoryUri : `${directoryUri}/`;
  return uri.startsWith(dir) && !uri.slice(dir.length).includes("..");
}
