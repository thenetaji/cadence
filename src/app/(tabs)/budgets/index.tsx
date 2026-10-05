import { useRouter } from 'expo-router';

import { EmptyState } from '@/components/app/empty-state';
import { TabScreen } from '@/components/app/tab-screen';
import { useBudgets } from '@/data/hooks';

export default function Budgets() {
  const router = useRouter();
  const hasBudgets = useBudgets().length > 0;
  return (
    <TabScreen>
      {hasBudgets ? null : <EmptyState message="No budgets" actionLabel="Add budget" onAction={() => router.push('/budget/new')} />}
    </TabScreen>
  );
}
