import type { TransactionListItem } from '@/data/hooks';
import { buildCategoryEntries } from './category-entries';

const tx = (over: Record<string, unknown>) => ({ kind: 'expense', isSplit: false, splits: [], dateKey: '2026-10-03', ...over }) as unknown as TransactionListItem;

describe('buildCategoryEntries', () => {
  it('groups by day, expands split lines of this category and skips transfers', () => {
    const items = [
      tx({ id: 'a', dateKey: '2026-10-05' }),
      tx({
        id: 'b',
        isSplit: true,
        title: 'Costco',
        splits: [
          { id: 's1', categoryId: 'food', amount: 100 },
          { id: 's2', categoryId: 'home', amount: 200 },
          { id: 's3', categoryId: 'food', amount: 50 },
        ],
      }),
      tx({ id: 'c', kind: 'transfer' }),
      tx({ id: 'd', isSplit: true, splits: [{ id: 's4', categoryId: 'home', amount: 1 }] }),
    ];
    const entries = buildCategoryEntries(items, 'food', '2026-10-05');
    expect(entries.map((e) => `${e.type}:${e.key}`)).toEqual(['header:h:2026-10-05', 'row:a', 'header:h:2026-10-03', 'split:b:s1', 'split:b:s3']);
    expect(entries[1]).toMatchObject({ last: true });
    expect(entries[3]).toMatchObject({ last: false });
    expect(entries[0]).toMatchObject({ label: 'Today' });
  });
});
