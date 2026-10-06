import { countFuturePosted, listRules } from '@/db/repos/recurring';
import type { RecurringRuleRow } from '@/db/schema';
import { useLiveData } from '../use-live-data';

/** Every rule, paused ones included, soonest due first. */
export function useRecurringRules(): RecurringRuleRow[] {
  return useLiveData(['recurring_rules'], '', listRules);
}

/** Transactions this rule already posted dated after today (they survive "Delete rule" unless asked). */
export function useFuturePostedCount(ruleId: string | undefined, todayKey: string): number {
  return useLiveData(['transactions'], `${ruleId ?? ''}:${todayKey}`, (db) => (ruleId ? countFuturePosted(db, ruleId, todayKey) : 0));
}
