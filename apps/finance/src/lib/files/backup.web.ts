import { backupFileName } from './paths';

/** Web QA fallback: a browser download. */
export async function shareBackupFile(json: string, date: Date | number = Date.now()): Promise<string> {
  const name = backupFileName(date);
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
  return name;
}

/** Web QA fallback: a file input; resolves null when the dialog is dismissed. */
export function pickBackupFile(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      file.text().then(resolve, () => resolve(null));
    };
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
}
