import { listAttachments } from '@/db/repos/attachments';
import type { AttachmentRow } from '@/db/schema';
import { useLiveData } from '@/data/use-live-data';

export function useAttachments(transactionId: string | undefined): AttachmentRow[] {
  return useLiveData(['attachments'], transactionId ?? '', (db) => (transactionId ? listAttachments(db, transactionId) : []));
}
