import type { AccountRow, CategoryRow } from '@/db/schema';
import { startSplit, type Draft } from './logic';

/** QA-only presets driven by `?dev=` on web and in development builds. */
export function applyDevPreset(
  draft: Draft,
  dev: string | undefined,
  accounts: readonly AccountRow[],
  categories: readonly CategoryRow[],
  extras: { personId: string | null; tagIds: string[] } = { personId: null, tagIds: [] },
): Draft {
  const category = (name: string) => categories.find((c) => c.name === name)?.id ?? null;
  switch (dev) {
    case 'filled':
      return { ...draft, kind: 'expense', amount: 34000, title: 'Sw', memo: 'Team lunch', categoryId: category('Food & Drink') };
    case 'split': {
      const lines = startSplit(324000, category('Groceries'));
      lines[0] = { ...lines[0]!, amount: 248000 };
      lines[1] = { ...lines[1]!, categoryId: category('Personal'), amount: 50000 };
      return { ...draft, kind: 'expense', amount: 324000, title: 'Reliance Smart', categoryId: null, splits: lines };
    }
    case 'fx': {
      const foreign = accounts.find((a) => a.currency !== accounts.find((x) => x.id === draft.accountId)?.currency);
      return { ...draft, kind: 'transfer', amount: 800000, transferAccountId: foreign?.id ?? draft.transferAccountId, categoryId: null };
    }
    case 'lend':
      return { ...draft, kind: 'lent', amount: 240000, title: 'Goa flights', personId: extras.personId, categoryId: null, splits: null };
    case 'tagged':
      return {
        ...draft,
        kind: 'expense',
        amount: 184000,
        title: 'Beach shack',
        memo: 'Dinner with the group',
        categoryId: category('Food & Drink'),
        tagIds: extras.tagIds,
        receipts: [{ key: 'dev-receipt', uri: DEV_RECEIPT, width: 240, height: 320 }],
      };
    default:
      return draft;
  }
}

/** A drawn slip of paper, so receipt thumbnails have something to show without a camera. */
const DEV_RECEIPT = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="320"><rect width="240" height="320" fill="#d9d5cc"/><rect x="30" y="20" width="180" height="290" fill="#f7f5f0"/>' +
    [50, 74, 98, 122, 146, 190, 214, 238].map((y, i) => `<rect x="48" y="${y}" width="${i % 3 === 0 ? 90 : 144}" height="6" fill="#6b675f"/>`).join('') +
    '<rect x="48" y="268" width="144" height="10" fill="#2b2924"/></svg>',
)}`;
