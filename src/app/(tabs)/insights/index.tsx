import { useRouter } from 'expo-router';

import { EmptyState } from '@/components/app/empty-state';
import { TabScreen } from '@/components/app/tab-screen';
import { useRecentTransactions } from '@/data/hooks';

export default function Insights() {
  const router = useRouter();
  const hasTransactions = useRecentTransactions(1).length > 0;
  return (
    <TabScreen fab={false}>
      {hasTransactions ? null : (
        <EmptyState message="Nothing in this period" actionLabel="Add transaction" onAction={() => router.push('/transaction/new')} />
      )}
    </TabScreen>
  );
}
