import { upcoming, type Occurrence } from '@/db/repos/recurring';
import { useLiveData } from '../use-live-data';
import { useTodayKey } from './useTodayKey';

export function useUpcoming(days: number): Occurrence[] {
  const today = useTodayKey();
  return useLiveData(['recurring_rules'], `${days}:${today}`, (db) => upcoming(db, today, days));
}
