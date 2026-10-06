import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
import { newId } from '@/db/ids';
import { imageExtension, isInsideDirectory } from './paths';

export interface PickedImage {
  uri: string;
  width?: number | null;
  height?: number | null;
}

const FOLDER = 'attachments';

function directory(): Directory {
  const dir = new Directory(Paths.document, FOLDER);
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

/**
 * Copies a picked image (usually from the picker's cache) into the app's document directory so it
 * outlives the picker and is included in device backups. Returns the new uri to store.
 * Web has no persistent file system: the uri is returned unchanged.
 */
export async function copyIntoAttachments(sourceUri: string): Promise<string> {
  if (Platform.OS === 'web') return sourceUri;
  const dest = new File(directory(), `${newId()}${imageExtension(sourceUri)}`);
  new File(sourceUri).copy(dest);
  return dest.uri;
}

/** Deletes an app-owned copy. Anything outside the attachments folder is left alone; missing files are fine. */
export async function deleteAttachmentFile(uri: string): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    if (!isInsideDirectory(uri, new Directory(Paths.document, FOLDER).uri)) return;
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // The file is already gone or unreadable; the metadata row is what matters.
  }
}
