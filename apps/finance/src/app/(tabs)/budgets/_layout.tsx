import { Stack, useRouter } from 'expo-router';

import { HeaderButton, barRight } from '@/components/app/header-button';
import { useTabStackOptions } from '@/components/app/tab-header';

export default function BudgetsLayout() {
  const options = useTabStackOptions();
  const router = useRouter();
  return (
    <Stack screenOptions={options}>
      <Stack.Screen
        name="index"
        options={{
          title: 'Budgets',
          ...barRight(<HeaderButton symbol="plus" label="Add budget" onPress={() => router.push('/budget/new')} />),
        }}
      />
    </Stack>
  );
}
