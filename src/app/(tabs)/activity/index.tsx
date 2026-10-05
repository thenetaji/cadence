import { format } from 'date-fns';
import { useRouter } from 'expo-router';

import { EmptyState } from '@/components/app/empty-state';
import { TabScreen } from '@/components/app/tab-screen';
import { useRecentTransactions } from '@/data/hooks';

export default function Activity() {
  const router = useRouter();
  const hasTransactions = useRecentTransactions(1).length > 0;
  return (
    <TabScreen>
      {hasTransactions ? null : (
        <EmptyState
          message={`Nothing in ${format(new Date(), 'MMMM')}`}
          actionLabel="Add transaction"
          onAction={() => router.push('/transaction/new')}
        />
      )}
    </TabScreen>
  );
}
