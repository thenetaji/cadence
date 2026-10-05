import type { TransactionListItem } from '@/data/hooks';
import { makeRateLookup } from '@/lib/money';

import { buildDayEntries, headerIndices, sumItems, type DayGroupContext } from './day-groups';

const ctx: DayGroupContext = {
  todayKey: '2026-10-05',
  displayCurrency: 'INR',
  locale: 'en-IN',
  showDecimals: false,
  rates: makeRateLookup([{ base: 'USD', quote: 'INR', rate: 80 }]),
};

function tx(id: string, dateKey: string, kind: TransactionListItem['kind'], amount: number, currency = 'INR'): TransactionListItem {
  return { id, dateKey, kind, amount, currency } as TransactionListItem;
}

describe('buildDayEntries', () => {
  const items = [
    tx('a', '2026-10-05', 'expense', 124000),
    tx('b', '2026-10-05', 'income', 50000),
    tx('c', '2026-10-04', 'transfer', 20000),
    tx('d', '2026-10-03', 'expense', 100, 'USD'),
  ];
  const entries = buildDayEntries(items, ctx);

  it('emits a header per day followed by its rows', () => {
    expect(entries.map((e) => e.type)).toEqual(['header', 'row', 'row', 'header', 'row', 'header', 'row']);
    expect(headerIndices(entries)).toEqual([0, 3, 5]);
  });

  it('labels days and totals the net of the day', () => {
    expect(entries[0]).toMatchObject({ label: 'Today', total: '−₹740' });
    expect(entries[3]).toMatchObject({ label: 'Yesterday', total: undefined });
    expect(entries[5]).toMatchObject({ label: 'Sat 3 Oct', total: '−₹80' });
  });

  it('marks the last row of each day', () => {
    expect(entries.filter((e) => e.type === 'row').map((e) => (e.type === 'row' ? e.last : null))).toEqual([false, true, true, true]);
  });

  it('keeps keys unique and stable', () => {
    const keys = entries.map((e) => e.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('sumItems', () => {
  it('converts foreign amounts and skips transfers', () => {
    const totals = sumItems([tx('a', 'k', 'expense', 1000), tx('b', 'k', 'income', 100, 'USD'), tx('c', 'k', 'transfer', 9999)], ctx);
    expect(totals).toEqual({ spent: 1000, earned: 8000 });
  });

  it('handles 5,000 rows', () => {
    const many = Array.from({ length: 5000 }, (_, i) => tx(`t${i}`, `2026-0${1 + (i % 9)}-10`, 'expense', 100));
    expect(buildDayEntries(many, ctx).length).toBeGreaterThan(5000);
  });
});
