import { backupFileName, imageExtension, isInsideDirectory } from './paths';

describe('file helpers', () => {
  it('names backups by local date', () => {
    expect(backupFileName(new Date(2026, 9, 6, 23, 59))).toBe('Farthing-backup-2026-10-06.json');
    expect(backupFileName(new Date(2026, 0, 3))).toBe('Farthing-backup-2026-01-03.json');
  });

  it('keeps an image extension, defaulting to jpg', () => {
    expect(imageExtension('file:///cache/ImagePicker/ABC.PNG')).toBe('.png');
    expect(imageExtension('file:///x/photo.heic?foo=1')).toBe('.heic');
    expect(imageExtension('file:///x/noext')).toBe('.jpg');
    expect(imageExtension('content://media/external/images/media/55')).toBe('.jpg');
  });

  it('only treats files inside the directory as app-owned', () => {
    const dir = 'file:///docs/attachments/';
    expect(isInsideDirectory('file:///docs/attachments/a.jpg', dir)).toBe(true);
    expect(isInsideDirectory('file:///docs/attachments/a.jpg', 'file:///docs/attachments')).toBe(true);
    expect(isInsideDirectory('file:///docs/other/a.jpg', dir)).toBe(false);
    expect(isInsideDirectory('file:///docs/attachments-evil/a.jpg', dir)).toBe(false);
    expect(isInsideDirectory('file:///docs/attachments/../secret.db', dir)).toBe(false);
  });
});
