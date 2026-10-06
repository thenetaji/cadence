import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useDb } from '@/db/context';
import { rescheduleAll, setRemindersActive } from '@/lib/reminders';

/**
 * Mount once near the app root. Plans local notifications now and whenever the app returns to the
 * foreground, and enables the automatic re-plan that actions run after relevant writes.
 */
export function useReminderSync(): void {
  const db = useDb();
  useEffect(() => {
    setRemindersActive(true);
    const run = () => void rescheduleAll(db).catch(() => undefined);
    run();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') run();
    });
    return () => {
      subscription.remove();
      setRemindersActive(false);
    };
  }, [db]);
}
