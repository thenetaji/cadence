/** @jest-environment node */
import { Platform } from 'react-native';
import { copyIntoAttachments, deleteAttachmentFile } from './attachments';

const mockCopied: { from: string; to: string }[] = [];
const mockDeleted: string[] = [];
const mockExisting = new Set<string>();

jest.mock('expo-file-system', () => {
  class Directory {
    uri: string;
    exists = true;
    constructor(...parts: (string | { uri: string })[]) {
      this.uri = parts.map((p) => (typeof p === 'string' ? p : p.uri)).join('/').replace(/\/+$/, '').replace(':/', ':///').replace(/:\/{4,}/, ':///');
    }
    create() {}
  }
  class File {
    uri: string;
    constructor(...parts: (string | { uri: string })[]) {
      this.uri = parts.map((p) => (typeof p === 'string' ? p : p.uri)).join('/');
    }
    get exists() {
      return mockExisting.has(this.uri);
    }
    copy(dest: { uri: string }) {
      mockCopied.push({ from: this.uri, to: dest.uri });
    }
    delete() {
      mockDeleted.push(this.uri);
    }
  }
  return { Directory, File, Paths: { document: new Directory('file:///docs') } };
});

describe('attachment files', () => {
  beforeEach(() => {
    mockCopied.length = 0;
    mockDeleted.length = 0;
    mockExisting.clear();
  });

  it('copies a picked image into the attachments folder, keeping its extension', async () => {
    const uri = await copyIntoAttachments('file:///cache/ImagePicker/photo.PNG');
    expect(uri).toMatch(/^file:\/\/\/docs\/attachments\/.+\.png$/);
    expect(mockCopied).toEqual([{ from: 'file:///cache/ImagePicker/photo.PNG', to: uri }]);
  });

  it('deletes only app-owned copies and tolerates missing files', async () => {
    mockExisting.add('file:///docs/attachments/a.jpg');
    mockExisting.add('file:///elsewhere/b.jpg');
    await deleteAttachmentFile('file:///docs/attachments/a.jpg');
    await deleteAttachmentFile('file:///elsewhere/b.jpg');
    await deleteAttachmentFile('file:///docs/attachments/missing.jpg');
    expect(mockDeleted).toEqual(['file:///docs/attachments/a.jpg']);
  });

  it('does nothing on web', async () => {
    const original = Platform.OS;
    Platform.OS = 'web';
    try {
      expect(await copyIntoAttachments('blob:abc')).toBe('blob:abc');
      await deleteAttachmentFile('file:///docs/attachments/a.jpg');
      expect(mockCopied).toEqual([]);
      expect(mockDeleted).toEqual([]);
    } finally {
      Platform.OS = original;
    }
  });
});
