import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';

import { SymbolIcon } from '@/components/app/symbol';
import { useTokens } from '@/theme/use-tokens';

const tabs = [
  { name: '(home)', title: 'Home', symbol: 'house.fill' },
  { name: 'activity', title: 'Activity', symbol: 'list.bullet.rectangle.fill' },
  { name: 'insights', title: 'Insights', symbol: 'chart.pie.fill' },
  { name: 'budgets', title: 'Budgets', symbol: 'gauge.with.dots.needle.33percent' },
] as const;

export default function TabsLayout() {
  const { colors } = useTokens();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.separator, borderTopWidth: StyleSheet.hairlineWidth },
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused }) => <SymbolIcon name={tab.symbol} size={24} color={focused ? colors.accent : colors.textTertiary} />,
          }}
        />
      ))}
    </Tabs>
  );
}
