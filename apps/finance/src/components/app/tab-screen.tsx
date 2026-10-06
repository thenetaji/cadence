import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';

import { AddFab } from '@/components/app/add-fab';

type TabScreenProps = { children: ReactNode; fab?: boolean };

function TabScreen({ children, fab = true }: TabScreenProps) {
  return (
    <View className="flex-1 bg-bg">
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerClassName="flex-grow justify-center pb-24">
        {children}
      </ScrollView>
      {fab ? <AddFab /> : null}
    </View>
  );
}

export { TabScreen };
