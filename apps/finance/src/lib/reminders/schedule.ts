import { addDays, keyToLocalMs, toDateKey, type DateKey } from "@studio/dates";
import { formatMoney } from "@studio/money";
import { occurrencesBetween, type Frequency } from "@/lib/recurring";

export type ReminderTrigger =
  | { type: "daily"; hour: number; minute: number }
  | { type: "date"; at: number };

export interface PlannedNotification {
  /** Stable identifier: scheduling the same id twice replaces, never duplicates. */
  id: string;
  kind: "daily" | "bill" | "budget";
  title: string;
  body: string;
  trigger: ReminderTrigger;
}

export interface ReminderSettings {
  dailyEnabled: boolean;
  /** 'HH:mm', local time. */
  dailyTime: string;
  bills: boolean;
  budgets: boolean;
}

/** iOS keeps at most 64 pending local notifications; stay below it. */
export const MAX_SCHEDULED = 60;
export const BILL_WINDOW_DAYS = 30;
/** Local hour at which "due tomorrow" reminders fire. */
export const BILL_REMINDER_HOUR = 9;
export const BUDGET_THRESHOLDS = [80, 100] as const;

export function parseTime(time: string): { hour: number; minute: number } {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  const hour = match ? Number(match[1]) : 21;
  const minute = match ? Number(match[2]) : 0;
  return hour > 23 || minute > 59 ? { hour: 21, minute: 0 } : { hour, minute };
}

export function planDailyReminder(
  settings: Pick<ReminderSettings, "dailyEnabled" | "dailyTime">,
): PlannedNotification | null {
  if (!settings.dailyEnabled) return null;
  const { hour, minute } = parseTime(settings.dailyTime);
  return {
    id: "daily",
    kind: "daily",
    title: "Log today",
    body: "Add what you spent today.",
    trigger: { type: "daily", hour, minute },
  };
}

export interface BillRule {
  id: string;
  kind: string;
  title: string;
  amount: number;
  currency: string;
  frequency: Frequency;
  interval: number;
  anchorDay: number | null;
  startDate: DateKey;
  endDate: DateKey | null;
  nextDue: DateKey;
  pausedAt: number | null;
}

/**
 * One reminder per due date in the next `days` days for every active expense rule, fired at
 * 09:00 local the day before. Reminders already in the past are dropped.
 */
export function planBillReminders(
  rules: readonly BillRule[],
  now: number,
  options: { days?: number; locale?: string } = {},
): PlannedNotification[] {
  const today = toDateKey(now);
  const horizon = addDays(today, options.days ?? BILL_WINDOW_DAYS);
  const out: PlannedNotification[] = [];
  for (const rule of rules) {
    if (rule.kind !== "expense" || rule.pausedAt !== null) continue;
    for (const due of occurrencesBetween(rule, rule.nextDue, horizon, {
      endDate: rule.endDate,
      limit: 40,
    })) {
      const at = keyToLocalMs(addDays(due, -1), BILL_REMINDER_HOUR);
      if (at <= now) continue;
      out.push({
        id: `bill:${rule.id}:${due}`,
        kind: "bill",
        title: rule.title || "Bill due",
        body: `Due tomorrow, ${formatMoney(rule.amount, rule.currency, { sign: "none", locale: options.locale })}.`,
        trigger: { type: "date", at },
      });
    }
  }
  return out.sort(
    (a, b) =>
      triggerTime(a, now) - triggerTime(b, now) || a.id.localeCompare(b.id),
  );
}

export interface BudgetProgressInput {
  budgetId: string;
  name: string;
  /** Budget limit and spend in the budget's currency. */
  amount: number;
  spent: number;
  currency: string;
  /** First day of the budget's current period; part of the alert key so each period alerts afresh. */
  periodFrom: DateKey;
}

export const budgetAlertKey = (
  budgetId: string,
  periodFrom: DateKey,
  threshold: number,
) => `${budgetId}:${periodFrom}:${threshold}`;

export interface BudgetAlertPlan {
  notifications: PlannedNotification[];
  /** Alerts that now count as raised. Store it and pass it back as `fired` next time. */
  fired: string[];
}

/**
 * Alerts when a budget reaches 80% and 100% of its limit. `fired` holds alerts already raised so
 * a reschedule never repeats one; a threshold that is no longer reached (spend deleted, new period)
 * leaves `fired`, so crossing it again alerts again. Crossing both at once raises only the 100% alert.
 */
export function planBudgetAlerts(
  progress: readonly BudgetProgressInput[],
  fired: readonly string[],
  now: number,
  options: { locale?: string } = {},
): BudgetAlertPlan {
  const already = new Set(fired);
  const next: string[] = [];
  const notifications: PlannedNotification[] = [];
  for (const p of progress) {
    if (p.amount <= 0) continue;
    const reached = BUDGET_THRESHOLDS.filter(
      (t) => p.spent * 100 >= p.amount * t,
    );
    for (const t of reached)
      next.push(budgetAlertKey(p.budgetId, p.periodFrom, t));
    const top = reached[reached.length - 1];
    if (
      top === undefined ||
      already.has(budgetAlertKey(p.budgetId, p.periodFrom, top))
    )
      continue;
    const left = p.amount - p.spent;
    const money = (value: number) =>
      formatMoney(Math.abs(value), p.currency, {
        sign: "none",
        locale: options.locale,
      });
    notifications.push({
      id: `budget:${budgetAlertKey(p.budgetId, p.periodFrom, top)}`,
      kind: "budget",
      title: p.name,
      body:
        top >= 100
          ? left < 0
            ? `Over budget by ${money(left)}.`
            : "Budget reached."
          : `80% used, ${money(left)} left.`,
      // A moment from now so the system delivers it as a normal local notification.
      trigger: { type: "date", at: now + 2000 },
    });
  }
  return { notifications, fired: next };
}

function triggerTime(n: PlannedNotification, now: number): number {
  return n.trigger.type === "date" ? n.trigger.at : now;
}

export interface PlanInput {
  settings: ReminderSettings;
  rules: readonly BillRule[];
  budgets: readonly BudgetProgressInput[];
  fired: readonly string[];
  now: number;
  locale?: string;
}

export interface ReminderPlan {
  notifications: PlannedNotification[];
  /** Persist as `reminder_budget_fired`. */
  fired: string[];
}

/** Everything that should be scheduled right now, capped at {@link MAX_SCHEDULED}; budget alerts and the daily reminder win over bills. */
export function planReminders(input: PlanInput): ReminderPlan {
  const daily = planDailyReminder(input.settings);
  const budget = input.settings.budgets
    ? planBudgetAlerts(input.budgets, input.fired, input.now, {
        locale: input.locale,
      })
    : { notifications: [], fired: [...input.fired] };
  const bills = input.settings.bills
    ? planBillReminders(input.rules, input.now, { locale: input.locale })
    : [];
  const head = [...(daily ? [daily] : []), ...budget.notifications];
  return {
    notifications: [
      ...head,
      ...bills.slice(0, Math.max(0, MAX_SCHEDULED - head.length)),
    ],
    fired: budget.fired,
  };
}
