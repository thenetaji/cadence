import type { AccountWithBalance } from '@/data/hooks';
import { makeRateLookup } from '@studio/money';

import { totalInDisplay } from './model';

const account = (name: string, currency: string, balance: number) => ({ id: name, name, currency, balance }) as unknown as AccountWithBalance;

describe('totalInDisplay', () => {
  const rates = makeRateLookup([{ base: 'USD', quote: 'INR', rate: 80 }]);
  it('converts accounts that have a rate', () => {
    const { total, excluded } = totalInDisplay([account('Cash', 'INR', 10000), account('Wise', 'USD', 100)], { displayCurrency: 'INR', rates });
    expect(total).toBe(10000 + 8000);
    expect(excluded).toEqual([]);
  });
  it('excludes accounts with no rate instead of adding them unconverted', () => {
    const { total, excluded } = totalInDisplay([account('Cash', 'INR', 10000), account('Euro', 'EUR', 100)], { displayCurrency: 'INR', rates });
    expect(total).toBe(10000);
    expect(excluded.map((a) => a.name)).toEqual(['Euro']);
  });
});
