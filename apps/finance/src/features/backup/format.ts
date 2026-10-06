import { monthShort } from '@/lib/dates';
import type { UnavailableReason } from '@/lib/sync';

const pad = (n: number) => String(n).padStart(2, '0');

/** "6 Oct, 21:04" in local time. */
export function backupTimeLabel(ms: number): string {
  const d = new Date(ms);
  return `${d.getDate()} ${monthShort(d.getMonth() + 1)}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Footnote shown on a sync row that cannot run in this build. */
export function unavailableNote(reason: UnavailableReason): string {
  switch (reason) {
    case 'needs-paid-developer-account':
      return 'Needs App Store build';
    case 'needs-standalone-build':
      return 'Needs standalone app';
    case 'not-configured':
      return 'Not set up';
  }
}
