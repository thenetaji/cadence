import { keyToLocalMs } from '@/lib/dates';
import {
  addSplitLine,
  autoReceives,
  buildRuleInput,
  buildTransactionInput,
  collapsedCategory,
  dateChipLabel,
  draftFromTransaction,
  emptyDraft,
  isSaveDisabled,
  kindChangePatch,
  MAX_SPLIT_LINES,
  removeSplitLine,
  repeatLabel,
  resolveDefaults,
  saveBlock,
  splitRemaining,
  startSplit,
  updateSplitLine,
  type Draft,
} from './logic';

const accounts = [{ id: 'a1' }, { id: 'a2' }, { id: 'a3' }];
const categories = [
  { id: 'food', kind: 'expense' },
  { id: 'rent', kind: 'expense' },
  { id: 'pay', kind: 'income' },
];
const base: Draft = { ...emptyDraft({ kind: 'expense', accountId: 'a1', transferAccountId: null, categoryId: null }, keyToLocalMs('2026-10-05', 14, 32)), amount: 10000 };
const same = { sameCurrency: true, receivesAmount: 0 };

describe('splits', () => {
  it('starts with the full amount on the current category and an empty line', () => {
    const lines = startSplit(5000, 'food');
    expect(lines.map((l) => [l.categoryId, l.amount])).toEqual([['food', 5000], [null, 0]]);
    expect(splitRemaining(5000, lines)).toBe(0);
  });

  it('computes the remainder against the total, including overshoot', () => {
    let lines = startSplit(10000, 'food');
    lines = updateSplitLine(lines, lines[0]!.key, { amount: 6000 });
    expect(splitRemaining(10000, lines)).toBe(4000);
    lines = updateSplitLine(lines, lines[1]!.key, { amount: 5000 });
    expect(splitRemaining(10000, lines)).toBe(-1000);
  });

  it('caps at 8 lines and collapses below 2', () => {
    let lines = startSplit(100, 'food');
    for (let i = 0; i < 10; i++) lines = addSplitLine(lines);
    expect(lines).toHaveLength(MAX_SPLIT_LINES);
    const two = startSplit(100, 'food');
    expect(removeSplitLine(two, two[1]!.key)).toBeNull();
    expect(collapsedCategory(two)).toBe('food');
    expect(removeSplitLine(lines, lines[0]!.key)).toHaveLength(MAX_SPLIT_LINES - 1);
  });
});

describe('defaults', () => {
  const input = { params: {}, lastKind: 'income' as const, lastAccountId: 'a2', defaultAccountId: 'a1', accounts, categories };

  it('uses last kind and last account', () => {
    expect(resolveDefaults(input)).toMatchObject({ kind: 'income', accountId: 'a2', categoryId: null });
  });

  it('prefers params, then falls back to the default account when the last one is gone', () => {
    expect(resolveDefaults({ ...input, params: { kind: 'expense', accountId: 'a3' } })).toMatchObject({ kind: 'expense', accountId: 'a3' });
    expect(resolveDefaults({ ...input, lastAccountId: 'archived' }).accountId).toBe('a1');
    expect(resolveDefaults({ ...input, lastAccountId: null, defaultAccountId: null }).accountId).toBe('a1');
  });

  it('ignores an invalid kind and a category of the wrong kind', () => {
    expect(resolveDefaults({ ...input, params: { kind: 'bogus', categoryId: 'pay' } })).toMatchObject({ kind: 'income', categoryId: 'pay' });
    expect(resolveDefaults({ ...input, params: { kind: 'expense', categoryId: 'pay' } }).categoryId).toBeNull();
  });

  it('picks a different destination for transfers', () => {
    expect(resolveDefaults({ ...input, params: { kind: 'transfer' } })).toMatchObject({ accountId: 'a2', transferAccountId: 'a1' });
  });

  it('kind change keeps a matching category and drops splits', () => {
    const draft = { accountId: 'a1', categoryId: 'food', transferAccountId: null };
    expect(kindChangePatch(draft, 'income', accounts, categories)).toMatchObject({ categoryId: null, splits: null });
    expect(kindChangePatch(draft, 'expense', accounts, categories).categoryId).toBe('food');
    expect(kindChangePatch(draft, 'transfer', accounts, categories)).toMatchObject({ categoryId: null, transferAccountId: 'a2' });
  });
});

describe('save validation', () => {
  it('requires an amount, and a category (which shakes rather than disables)', () => {
    expect(saveBlock({ ...base, amount: 0 }, same)).toBe('amount');
    expect(isSaveDisabled('amount')).toBe(true);
    expect(saveBlock(base, same)).toBe('category');
    expect(isSaveDisabled('category')).toBe(false);
    expect(saveBlock({ ...base, categoryId: 'food' }, same)).toBeNull();
  });

  it('blocks unbalanced splits and shakes on a missing split category', () => {
    const lines = startSplit(10000, 'food');
    expect(saveBlock({ ...base, splits: lines }, same)).toBe('split_total');
    const balanced = updateSplitLine(updateSplitLine(lines, lines[0]!.key, { amount: 6000 }), lines[1]!.key, { amount: 4000 });
    expect(saveBlock({ ...base, splits: balanced }, same)).toBe('split_category');
    const full = updateSplitLine(balanced, lines[1]!.key, { categoryId: 'rent' });
    expect(saveBlock({ ...base, splits: full }, same)).toBeNull();
  });

  it('needs two different accounts and a receives amount across currencies', () => {
    const t: Draft = { ...base, kind: 'transfer', transferAccountId: 'a1' };
    expect(saveBlock(t, same)).toBe('accounts');
    const ok = { ...t, transferAccountId: 'a2' };
    expect(saveBlock(ok, same)).toBeNull();
    expect(saveBlock(ok, { sameCurrency: false, receivesAmount: 0 })).toBe('receives');
    expect(saveBlock(ok, { sameCurrency: false, receivesAmount: 120 })).toBeNull();
  });

  it('prefills receives from the rate', () => {
    expect(autoReceives(100000, 'INR', 'USD', 0.012)).toBe(1200);
    expect(autoReceives(100000, 'INR', 'USD', null)).toBe(0);
    expect(autoReceives(5000, 'INR', 'INR', null)).toBe(5000);
  });
});

describe('draft to repo input', () => {
  it('maps an expense', () => {
    const d: Draft = { ...base, categoryId: 'food', title: ' Lunch ', memo: 'x' };
    expect(buildTransactionInput(d, same, 'rule1')).toMatchObject({
      kind: 'expense',
      amount: 10000,
      accountId: 'a1',
      categoryId: 'food',
      recurringRuleId: 'rule1',
      occurredAt: d.occurredAt,
    });
  });

  it('maps splits without a category', () => {
    const lines = startSplit(10000, 'food');
    const balanced = updateSplitLine(updateSplitLine(lines, lines[0]!.key, { amount: 7000 }), lines[1]!.key, { amount: 3000, categoryId: 'rent' });
    const input = buildTransactionInput({ ...base, splits: balanced }, same);
    expect(input.splits).toEqual([{ categoryId: 'food', amount: 7000 }, { categoryId: 'rent', amount: 3000 }]);
    expect(input.categoryId).toBeUndefined();
  });

  it('maps transfers with the receives amount only across currencies', () => {
    const t: Draft = { ...base, kind: 'transfer', transferAccountId: 'a2' };
    expect(buildTransactionInput(t, same).transferAmount).toBe(10000);
    expect(buildTransactionInput(t, { sameCurrency: false, receivesAmount: 120 }).transferAmount).toBe(120);
  });

  it('builds the rule with next_due after this first occurrence', () => {
    const d: Draft = { ...base, categoryId: 'food', repeat: { frequency: 'monthly', interval: 1, endDate: null } };
    const rule = buildRuleInput(d, same, 'Food');
    expect(rule).toMatchObject({ startDate: '2026-10-05', nextDue: '2026-11-05', frequency: 'monthly', title: 'Food', categoryId: 'food' });
    const weekly = buildRuleInput({ ...d, repeat: { frequency: 'weekly', interval: 2, endDate: '2027-01-01' } }, same, 'Food');
    expect(weekly).toMatchObject({ nextDue: '2026-10-19', endDate: '2027-01-01' });
    expect(buildRuleInput({ ...d, repeat: null }, same, 'Food')).toBeNull();
  });

  it('uses the first split category for a repeating split', () => {
    const lines = startSplit(10000, 'food');
    const rule = buildRuleInput({ ...base, splits: lines, repeat: { frequency: 'daily', interval: 1, endDate: null } }, same, '');
    expect(rule?.categoryId).toBe('food');
  });
});

describe('labels and factories', () => {
  it('labels repeat and date', () => {
    expect(repeatLabel(null)).toBe('Never');
    expect(repeatLabel({ frequency: 'monthly', interval: 1 })).toBe('Monthly');
    expect(repeatLabel({ frequency: 'weekly', interval: 3 })).toBe('Every 3 weeks');
    expect(dateChipLabel(keyToLocalMs('2026-10-05', 14, 32), '2026-10-05')).toBe('Today 14:32');
    expect(dateChipLabel(keyToLocalMs('2026-10-04', 9, 5), '2026-10-05')).toBe('Yesterday 09:05');
    expect(dateChipLabel(keyToLocalMs('2026-10-05', 14, 32), '2026-10-05', false)).toBe('Today');
  });

  it('keeps receives only for cross-currency transfers', () => {
    const src = { kind: 'transfer' as const, title: '', memo: '', amount: 1000, currency: 'INR', accountId: 'a1', categoryId: null, transferAccountId: 'a2', transferAmount: 12, transferCurrency: 'USD', occurredAt: 1, splits: [] };
    expect(draftFromTransaction(src, 5)).toMatchObject({ receives: 12, occurredAt: 5 });
    expect(draftFromTransaction({ ...src, transferCurrency: 'INR', transferAmount: 1000 }, 5).receives).toBeNull();
  });
});
