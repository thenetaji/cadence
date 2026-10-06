import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';

import { AppIcon } from '@studio/icons';
import { useTokens } from '@studio/theme';

const tabs = [
  { name: '(home)', title: 'Home', symbol: 'home' },
  { name: 'activity', title: 'Activity', symbol: 'activity' },
  { name: 'insights', title: 'Insights', symbol: 'insights' },
  { name: 'budgets', title: 'Budgets', symbol: 'budgets' },
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
            tabBarIcon: ({ focused }) => <AppIcon name={tab.symbol} size={24} color={focused ? colors.accent : colors.textTertiary} />,
          }}
        />
      ))}
    </Tabs>
  );
}
