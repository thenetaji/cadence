/** @jest-environment node */
import { createBudget } from '@/db/repos/budgets';
import { createRule } from '@/db/repos/recurring';
import { getSetting, setSetting } from '@/db/repos/settings';
import { createTransaction } from '@/db/repos/transactions';
import { at, categoryId, createTestDb, makeAccounts } from '@/db/test-helpers';
import { rescheduleAll, type NotificationsApi } from './adapter';
import {
  MAX_SCHEDULED,
  budgetAlertKey,
  parseTime,
  planBillReminders,
  planBudgetAlerts,
  planDailyReminder,
  planReminders,
  type BillRule,
  type PlannedNotification,
} from './schedule';

const NOW = new Date(2026, 9, 6, 12, 0).getTime();
const local = (y: number, m: number, d: number, h = 9) => new Date(y, m - 1, d, h, 0).getTime();

const rule = (over: Partial<BillRule> = {}): BillRule => ({
  id: 'r1',
  kind: 'expense',
  title: 'Rent',
  amount: 1500000,
  currency: 'INR',
  frequency: 'monthly',
  interval: 1,
  anchorDay: 20,
  startDate: '2026-08-20',
  endDate: null,
  nextDue: '2026-10-20',
  pausedAt: null,
  ...over,
});

describe('daily reminder', () => {
  it('is planned at the set time and absent when disabled', () => {
    expect(planDailyReminder({ dailyEnabled: false, dailyTime: '21:00' })).toBeNull();
    expect(planDailyReminder({ dailyEnabled: true, dailyTime: '07:05' })).toMatchObject({ id: 'daily', kind: 'daily', trigger: { type: 'daily', hour: 7, minute: 5 } });
  });

  it('falls back to 21:00 for unreadable times', () => {
    expect(parseTime('25:00')).toEqual({ hour: 21, minute: 0 });
    expect(parseTime('soon')).toEqual({ hour: 21, minute: 0 });
    expect(parseTime('9:30')).toEqual({ hour: 9, minute: 30 });
  });
});

describe('bill reminders', () => {
  it('fires at 09:00 the day before each due date within 30 days', () => {
    const out = planBillReminders([rule({ nextDue: '2026-10-20' })], NOW);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ id: 'bill:r1:2026-10-20', kind: 'bill', title: 'Rent', trigger: { type: 'date', at: local(2026, 10, 19) } });
    expect(out[0]?.body).toBe('Due tomorrow, ₹15,000.00.');
  });

  it('includes repeats inside the window and none beyond it', () => {
    const weekly = planBillReminders([rule({ id: 'w', frequency: 'weekly', anchorDay: 3, nextDue: '2026-10-07', startDate: '2026-10-07' })], NOW);
    // Due Oct 7 is reminded Oct 6 09:00, which has passed; Oct 14, 21, 28 and Nov 4 remain.
    expect(weekly.map((n) => n.id)).toEqual(['bill:w:2026-10-14', 'bill:w:2026-10-21', 'bill:w:2026-10-28', 'bill:w:2026-11-04']);
    expect(planBillReminders([rule({ nextDue: '2026-11-06' })], NOW)).toEqual([]);
    expect(planBillReminders([rule({ nextDue: '2026-11-05' })], NOW)).toHaveLength(1);
  });

  it('skips paused, ended, income and transfer rules and past reminders', () => {
    const rules = [
      rule({ id: 'p', pausedAt: 1 }),
      rule({ id: 'e', endDate: '2026-10-10' }),
      rule({ id: 'i', kind: 'income' }),
      rule({ id: 't', kind: 'transfer' }),
      rule({ id: 'today', nextDue: '2026-10-06' }),
      rule({ id: 'tomorrow', nextDue: '2026-10-07' }),
      rule({ id: 'ok', nextDue: '2026-10-08' }),
    ];
    // 'ok' recurs monthly: Nov 8 is beyond the 30-day window.
    expect(planBillReminders(rules, NOW).map((n) => n.id)).toEqual(['bill:ok:2026-10-08']);
  });

  it('orders reminders by time', () => {
    const out = planBillReminders([rule({ id: 'b', nextDue: '2026-10-25' }), rule({ id: 'a', nextDue: '2026-10-15' })], NOW);
    expect(out.map((n) => n.id)).toEqual(['bill:a:2026-10-15', 'bill:b:2026-10-25']);
  });
});

describe('budget alerts', () => {
  const progress = (spent: number, over: Partial<Parameters<typeof planBudgetAlerts>[0][number]> = {}) => ({
    budgetId: 'b1',
    name: 'Food',
    amount: 10000,
    spent,
    currency: 'INR',
    periodFrom: '2026-10-01',
    ...over,
  });

  it('alerts once at 80% and once at 100%', () => {
    const at79 = planBudgetAlerts([progress(7999)], [], NOW);
    expect(at79.notifications).toEqual([]);
    expect(at79.fired).toEqual([]);

    const at80 = planBudgetAlerts([progress(8000)], [], NOW);
    expect(at80.notifications).toHaveLength(1);
    expect(at80.notifications[0]).toMatchObject({ kind: 'budget', title: 'Food', id: `budget:${budgetAlertKey('b1', '2026-10-01', 80)}` });
    expect(at80.notifications[0]?.body).toContain('80% used');
    expect(at80.fired).toEqual([budgetAlertKey('b1', '2026-10-01', 80)]);
    // Rescheduling again does not repeat it.
    expect(planBudgetAlerts([progress(8100)], at80.fired, NOW).notifications).toEqual([]);

    const at100 = planBudgetAlerts([progress(10000)], at80.fired, NOW);
    expect(at100.notifications).toHaveLength(1);
    expect(at100.notifications[0]?.body).toBe('Budget reached.');
    expect(at100.fired).toEqual([budgetAlertKey('b1', '2026-10-01', 80), budgetAlertKey('b1', '2026-10-01', 100)]);
    expect(planBudgetAlerts([progress(12500)], [], NOW).notifications[0]?.body).toMatch(/^Over budget by .*25/);
  });

  it('raises only the 100% alert when both thresholds are crossed at once', () => {
    const out = planBudgetAlerts([progress(15000)], [], NOW);
    expect(out.notifications).toHaveLength(1);
    expect(out.notifications[0]?.id).toContain(':100');
    expect(out.fired).toHaveLength(2);
  });

  it('forgets thresholds no longer reached and alerts again each period', () => {
    const fired = [budgetAlertKey('b1', '2026-10-01', 80), budgetAlertKey('b1', '2026-10-01', 100), budgetAlertKey('gone', '2026-09-01', 80)];
    const dropped = planBudgetAlerts([progress(5000)], fired, NOW);
    expect(dropped.fired).toEqual([]);
    expect(planBudgetAlerts([progress(8000)], dropped.fired, NOW).notifications).toHaveLength(1);
    const nextPeriod = planBudgetAlerts([progress(8000, { periodFrom: '2026-11-01' })], [budgetAlertKey('b1', '2026-10-01', 80)], NOW);
    expect(nextPeriod.notifications).toHaveLength(1);
  });

  it('fires shortly after now and ignores zero limits', () => {
    expect(planBudgetAlerts([progress(8000)], [], NOW).notifications[0]?.trigger).toEqual({ type: 'date', at: NOW + 2000 });
    expect(planBudgetAlerts([progress(8000, { amount: 0 })], [], NOW).notifications).toEqual([]);
  });
});

describe('planReminders', () => {
  const settings = { dailyEnabled: true, dailyTime: '21:00', bills: true, budgets: true };

  it('combines the daily reminder, budget alerts and bills, honouring the toggles', () => {
    const input = {
      settings,
      rules: [rule()],
      budgets: [{ budgetId: 'b', name: 'All', amount: 100, spent: 90, currency: 'INR', periodFrom: '2026-10-01' }],
      fired: [],
      now: NOW,
    };
    expect(planReminders(input).notifications.map((n) => n.kind)).toEqual(['daily', 'budget', 'bill']);
    expect(planReminders({ ...input, settings: { ...settings, bills: false } }).notifications.map((n) => n.kind)).toEqual(['daily', 'budget']);
    const noBudgets = planReminders({ ...input, settings: { ...settings, budgets: false, dailyEnabled: false } });
    expect(noBudgets.notifications.map((n) => n.kind)).toEqual(['bill']);
    expect(noBudgets.fired).toEqual([]);
  });

  it('never schedules more than the platform limit', () => {
    const rules = Array.from({ length: 20 }, (_, i) => rule({ id: `d${i}`, frequency: 'daily', anchorDay: null, nextDue: '2026-10-08', startDate: '2026-10-08' }));
    const out = planReminders({ settings, rules, budgets: [], fired: [], now: NOW });
    expect(out.notifications).toHaveLength(MAX_SCHEDULED);
    expect(out.notifications[0]?.kind).toBe('daily');
    expect(new Set(out.notifications.map((n) => n.id)).size).toBe(MAX_SCHEDULED);
  });
});

function fakeApi(permission: 'granted' | 'denied' | 'undetermined' = 'granted') {
  const pending = new Map<string, PlannedNotification>();
  let current = permission;
  const api: NotificationsApi = {
    getPermission: async () => current,
    requestPermission: async () => (current = current === 'undetermined' ? 'granted' : current),
    pendingIds: async () => [...pending.keys()],
    cancel: async (id) => {
      pending.delete(id);
    },
    schedule: async (n) => {
      pending.set(n.id, n);
    },
  };
  return { api, pending };
}

const rentId = (pending: Map<string, PlannedNotification>) => [...pending.keys()].find((k) => k.startsWith('bill:'))?.slice(5) ?? '';

describe('rescheduleAll', () => {
  const setup = () => {
    const db = createTestDb();
    const { cash } = makeAccounts(db);
    createRule(db, { kind: 'expense', title: 'Rent', amount: 1500000, accountId: cash.id, categoryId: categoryId(db, 'Housing'), frequency: 'monthly', startDate: '2026-10-20' });
    setSetting(db, 'reminder_daily_enabled', true);
    return { db, cash };
  };

  it('schedules the plan and is idempotent', async () => {
    const { db } = setup();
    const { api, pending } = fakeApi();
    const first = await rescheduleAll(db, { api, now: NOW });
    expect(first).toEqual({ scheduled: 2, permission: 'granted' });
    const ids = [...pending.keys()].sort();
    expect(ids).toEqual(['bill:' + rentId(pending), 'daily'].sort());
    await rescheduleAll(db, { api, now: NOW });
    await rescheduleAll(db, { api, now: NOW });
    expect([...pending.keys()].sort()).toEqual(ids);
  });

  it('removes notifications that are no longer wanted', async () => {
    const { db } = setup();
    const { api, pending } = fakeApi();
    await rescheduleAll(db, { api, now: NOW });
    setSetting(db, 'reminder_daily_enabled', false);
    setSetting(db, 'reminder_bills', false);
    expect(await rescheduleAll(db, { api, now: NOW })).toMatchObject({ scheduled: 0 });
    expect(pending.size).toBe(0);
  });

  it('schedules nothing without permission and only asks when told to', async () => {
    const { db } = setup();
    const denied = fakeApi('denied');
    expect(await rescheduleAll(db, { api: denied.api, now: NOW })).toEqual({ scheduled: 0, permission: 'denied' });
    const undecided = fakeApi('undetermined');
    expect(await rescheduleAll(db, { api: undecided.api, now: NOW })).toEqual({ scheduled: 0, permission: 'undetermined' });
    expect(await rescheduleAll(db, { api: undecided.api, now: NOW, askPermission: true })).toMatchObject({ permission: 'granted', scheduled: 2 });
    expect(await rescheduleAll(db, { api: null })).toEqual({ scheduled: 0, permission: 'unsupported' });
  });

  it('raises a budget alert once on write and remembers it', async () => {
    const { db, cash } = setup();
    createBudget(db, { name: 'Food', amount: 10000, currency: 'INR', period: 'monthly', startAnchor: 1, scope: 'all' });
    const { api, pending } = fakeApi();
    createTransaction(db, { kind: 'expense', amount: 8500, accountId: cash.id, categoryId: categoryId(db, 'Food & Drink'), occurredAt: at('2026-10-05') });
    const first = await rescheduleAll(db, { api, now: NOW });
    expect([...pending.keys()].filter((k) => k.startsWith('budget:'))).toHaveLength(1);
    expect(first.scheduled).toBe(3);
    expect(getSetting(db, 'reminder_budget_fired')).toHaveLength(1);
    // The pending alert survives a reschedule and is not duplicated.
    const second = await rescheduleAll(db, { api, now: NOW });
    expect(second.scheduled).toBe(2);
    expect([...pending.keys()].filter((k) => k.startsWith('budget:'))).toHaveLength(1);
    createTransaction(db, { kind: 'expense', amount: 2000, accountId: cash.id, categoryId: categoryId(db, 'Food & Drink'), occurredAt: at('2026-10-05') });
    await rescheduleAll(db, { api, now: NOW });
    expect([...pending.keys()].filter((k) => k.startsWith('budget:'))).toHaveLength(2);
    expect(getSetting(db, 'reminder_budget_fired')).toHaveLength(2);
  });
});
