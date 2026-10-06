import { listSubscriptions, type SubscriptionList } from '@/db/repos/subscriptions';
import { useLiveData } from '../use-live-data';

/** Active expense rules with normalised monthly/yearly cost and next charge date, plus totals. */
export function useSubscriptions(): SubscriptionList {
  return useLiveData(['recurring_rules', 'fx_rates', 'settings'], '', listSubscriptions);
}

export type { Subscription, SubscriptionList } from '@/db/repos/subscriptions';
