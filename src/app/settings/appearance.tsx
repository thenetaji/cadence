import { ScrollView } from 'react-native';

import { ListGroup, ListRow } from '@/components/app/list-group';
import { SymbolIcon } from '@/components/app/symbol';
import { useSetting } from '@/data/hooks';
import { haptic } from '@/theme/haptics';
import { useTokens } from '@/theme/use-tokens';

const options = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const;

export default function Appearance() {
  const { colors } = useTokens();
  const [theme, setTheme] = useSetting('theme');
  return (
    <ScrollView className="flex-1 bg-bg" contentInsetAdjustmentBehavior="automatic" contentContainerClassName="py-4">
      <ListGroup>
        {options.map((option) => (
          <ListRow
            key={option.value}
            label={option.label}
            trailing={theme === option.value ? <SymbolIcon name="checkmark" size={16} color={colors.accent} weight="semibold" /> : undefined}
            onPress={() => {
              haptic('selection');
              setTheme(option.value);
            }}
          />
        ))}
      </ListGroup>
    </ScrollView>
  );
}
