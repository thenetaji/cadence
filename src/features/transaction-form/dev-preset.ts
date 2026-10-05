import type { AccountRow, CategoryRow } from '@/db/schema';
import { startSplit, type Draft } from './logic';

/** QA-only presets driven by `?dev=` on web and in development builds. */
export function applyDevPreset(draft: Draft, dev: string | undefined, accounts: readonly AccountRow[], categories: readonly CategoryRow[]): Draft {
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
    default:
      return draft;
  }
}
