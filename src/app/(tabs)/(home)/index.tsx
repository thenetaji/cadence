import { useRouter } from 'expo-router';

import { EmptyState } from '@/components/app/empty-state';
import { TabScreen } from '@/components/app/tab-screen';
import { useRecentTransactions } from '@/data/hooks';

export default function Home() {
  const router = useRouter();
  const hasTransactions = useRecentTransactions(1).length > 0;
  return (
    <TabScreen>
      {hasTransactions ? null : (
        <EmptyState message="No transactions yet" actionLabel="Add transaction" onAction={() => router.push('/transaction/new')} />
      )}
    </TabScreen>
  );
}
