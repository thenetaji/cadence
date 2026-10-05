/** @jest-environment node */
import { eq } from 'drizzle-orm';
import { toDateKey } from '@/lib/dates';
import { recurringRules, transactions } from '../schema';
import { at, categoryId, createTestDb, makeAccounts } from '../test-helpers';
import { getAccountBalance } from './accounts';
import {
  countFuturePosted,
  createRule,
  deleteRule,
  getRule,
  listRules,
  postDue,
  postNow,
  POST_CAP_PER_RULE,
  setRulePaused,
  skip,
  updateRule,
  upcoming,
} from './recurring';

const setup = () => {
  const db = createTestDb();
  const accts = makeAccounts(db);
  return { db, ...accts, bills: categoryId(db, 'Bills'), subs: categoryId(db, 'Subscriptions') };
};

const posted = (db: ReturnType<typeof createTestDb>, ruleId: string) =>
  db.select().from(transactions).where(eq(transactions.recurringRuleId, ruleId)).orderBy(transactions.dateKey).all();

describe('recurring rules', () => {
  it('derives anchors and defaults', () => {
    const { db, cash, subs } = setup();
    const monthly = createRule(db, { kind: 'expense', title: 'Rent', amount: 1, accountId: cash.id, categoryId: subs, frequency: 'monthly', startDate: '2026-01-31' });
    const weekly = createRule(db, { kind: 'expense', title: 'Maid', amount: 1, accountId: cash.id, categoryId: subs, frequency: 'weekly', startDate: '2026-10-07' });
    expect(monthly).toMatchObject({ anchorDay: 31, nextDue: '2026-01-31', interval: 1, autoPost: true, currency: 'INR' });
    expect(weekly.anchorDay).toBe(3);
    expect(listRules(db)).toHaveLength(2);
  });

  it('posts at 09:00 local on the due date and advances', () => {
    const { db, cash, subs } = setup();
    const rule = createRule(db, { kind: 'expense', title: 'Netflix', memo: 'plan', amount: 64900, accountId: cash.id, categoryId: subs, frequency: 'monthly', startDate: '2026-08-05' });
    const result = postDue(db, '2026-10-05', at('2026-10-05', 10));
    expect(result.posted).toBe(3);
    const rows = posted(db, rule.id);
    expect(rows.map((r) => r.dateKey)).toEqual(['2026-08-05', '2026-09-05', '2026-10-05']);
    expect(rows.every((r) => r.title === 'Netflix' && r.memo === 'plan' && r.amount === 64900)).toBe(true);
    expect(new Date(rows[0]?.occurredAt ?? 0).getHours()).toBe(9);
    expect(toDateKey(rows[0]?.occurredAt ?? 0)).toBe('2026-08-05');
    expect(getRule(db, rule.id)?.nextDue).toBe('2026-11-05');
  });

  it('is idempotent', () => {
    const { db, cash, subs } = setup();
    createRule(db, { kind: 'expense', title: 'Netflix', amount: 100, accountId: cash.id, categoryId: subs, frequency: 'daily', startDate: '2026-10-01' });
    expect(postDue(db, '2026-10-05').posted).toBe(5);
    expect(postDue(db, '2026-10-05').posted).toBe(0);
    expect(postDue(db, '2026-10-06').posted).toBe(1);
    expect(db.select().from(transactions).all()).toHaveLength(6);
  });

  it('caps at 100 per rule per run and finishes on the next', () => {
    const { db, cash, subs } = setup();
    const rule = createRule(db, { kind: 'expense', title: 'Daily', amount: 1, accountId: cash.id, categoryId: subs, frequency: 'daily', startDate: '2025-01-01' });
    expect(postDue(db, '2026-10-05').posted).toBe(POST_CAP_PER_RULE);
    expect(getRule(db, rule.id)?.nextDue).toBe('2025-04-11');
    postDue(db, '2026-10-05');
    expect(posted(db, rule.id).length).toBe(2 * POST_CAP_PER_RULE);
  });

  it('honours end_date, paused rules and non-auto rules', () => {
    const { db, cash, subs } = setup();
    const ended = createRule(db, { kind: 'expense', title: 'Ended', amount: 1, accountId: cash.id, categoryId: subs, frequency: 'daily', startDate: '2026-10-01', endDate: '2026-10-02' });
    const paused = createRule(db, { kind: 'expense', title: 'Paused', amount: 1, accountId: cash.id, categoryId: subs, frequency: 'daily', startDate: '2026-10-01' });
    const manual = createRule(db, { kind: 'expense', title: 'Manual', amount: 1, accountId: cash.id, categoryId: subs, frequency: 'daily', startDate: '2026-10-01', autoPost: false });
    setRulePaused(db, paused.id, true);
    postDue(db, '2026-10-05');
    expect(posted(db, ended.id).map((r) => r.dateKey)).toEqual(['2026-10-01', '2026-10-02']);
    expect(posted(db, paused.id)).toHaveLength(0);
    expect(posted(db, manual.id)).toHaveLength(0);
    setRulePaused(db, paused.id, false);
    expect(postDue(db, '2026-10-05').posted).toBe(5);
    expect(db.select().from(transactions).all()).toHaveLength(7);
  });

  it('posts the 31st rule on 28/29/30 in short months', () => {
    const { db, cash, subs } = setup();
    const rule = createRule(db, { kind: 'expense', title: 'Rent', amount: 1, accountId: cash.id, categoryId: subs, frequency: 'monthly', startDate: '2027-01-31' });
    postDue(db, '2027-05-31');
    expect(posted(db, rule.id).map((r) => r.dateKey)).toEqual(['2027-01-31', '2027-02-28', '2027-03-31', '2027-04-30', '2027-05-31']);
  });

  it('posts transfer rules, including cross-currency amounts', () => {
    const { db, bank, usd } = setup();
    const rule = createRule(db, { kind: 'transfer', title: 'SIP', amount: 832000, transferAmount: 10000, accountId: bank.id, transferAccountId: usd.id, frequency: 'monthly', startDate: '2026-10-01' });
    postDue(db, '2026-10-05');
    expect(posted(db, rule.id)[0]).toMatchObject({ kind: 'transfer', transferAmount: 10000, transferCurrency: 'USD' });
    expect(getAccountBalance(db, usd.id)).toBe(110000);
  });

  it('skip advances without posting, postNow posts and advances', () => {
    const { db, cash, subs } = setup();
    const rule = createRule(db, { kind: 'expense', title: 'Gym', amount: 100, accountId: cash.id, categoryId: subs, frequency: 'monthly', startDate: '2026-10-05' });
    skip(db, rule.id);
    expect(getRule(db, rule.id)?.nextDue).toBe('2026-11-05');
    expect(posted(db, rule.id)).toHaveLength(0);
    const id = postNow(db, rule.id);
    expect(db.select().from(transactions).where(eq(transactions.id, id)).get()).toMatchObject({ dateKey: '2026-11-05', recurringRuleId: rule.id });
    expect(getRule(db, rule.id)?.nextDue).toBe('2026-12-05');
  });

  it('lists upcoming occurrences within the window, soonest first', () => {
    const { db, cash, subs } = setup();
    createRule(db, { kind: 'expense', title: 'Weekly', amount: 1, accountId: cash.id, categoryId: subs, frequency: 'weekly', startDate: '2026-10-06' });
    createRule(db, { kind: 'expense', title: 'Later', amount: 1, accountId: cash.id, categoryId: subs, frequency: 'monthly', startDate: '2026-12-01' });
    const paused = createRule(db, { kind: 'expense', title: 'Paused', amount: 1, accountId: cash.id, categoryId: subs, frequency: 'daily', startDate: '2026-10-05' });
    setRulePaused(db, paused.id, true);
    createRule(db, { kind: 'expense', title: 'Ends', amount: 1, accountId: cash.id, categoryId: subs, frequency: 'daily', startDate: '2026-10-05', endDate: '2026-10-06' });
    const list = upcoming(db, '2026-10-05', 14);
    expect(list.map((o) => `${o.dueDate} ${o.rule.title}`)).toEqual([
      '2026-10-05 Ends',
      '2026-10-06 Ends',
      '2026-10-06 Weekly',
      '2026-10-13 Weekly',
    ]);
  });

  it('edits affect future postings only', () => {
    const { db, cash, subs } = setup();
    const rule = createRule(db, { kind: 'expense', title: 'Gym', amount: 100, accountId: cash.id, categoryId: subs, frequency: 'monthly', startDate: '2026-09-05' });
    postDue(db, '2026-09-05');
    updateRule(db, rule.id, { amount: 200, frequency: 'weekly' });
    postDue(db, '2026-10-19');
    const rows = posted(db, rule.id);
    expect(rows.map((r) => r.amount)).toEqual([100, 200, 200, 200]);
    expect(getRule(db, rule.id)?.anchorDay).toBe(6);
  });

  it('deletes a rule, unlinking posted transactions and optionally removing future ones', () => {
    const { db, cash, subs } = setup();
    const rule = createRule(db, { kind: 'expense', title: 'Gym', amount: 100, accountId: cash.id, categoryId: subs, frequency: 'monthly', startDate: '2026-10-05' });
    postDue(db, '2026-10-05');
    postNow(db, rule.id);
    expect(countFuturePosted(db, rule.id, '2026-10-05')).toBe(1);
    deleteRule(db, rule.id, { deleteFuturePosted: true, todayKey: '2026-10-05' });
    expect(db.select().from(recurringRules).all()).toHaveLength(0);
    const left = db.select().from(transactions).all();
    expect(left).toHaveLength(1);
    expect(left[0]?.recurringRuleId).toBeNull();
  });
});
