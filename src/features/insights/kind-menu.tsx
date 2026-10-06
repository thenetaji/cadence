import * as React from 'react';
import { ActionSheetIOS, Platform, View } from 'react-native';

import { OptionPicker } from '@/components/app/option-picker';
import { SymbolIcon } from '@/components/app/symbol';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { haptic } from '@/theme/haptics';
import { useTokens } from '@/theme/use-tokens';

import type { InsightsKind } from './params';

const OPTIONS = [
  { value: 'expense' as const, label: 'Spent' },
  { value: 'income' as const, label: 'Earned' },
];

type KindMenuProps = { kind: InsightsKind; onChange: (kind: InsightsKind) => void };

/** Hero label as a menu chip: `Spent ▾`. Native action sheet on iOS, the shared option picker elsewhere. */
function KindMenu({ kind, onChange }: KindMenuProps) {
  const { colors, scheme } = useTokens();
  const [open, setOpen] = React.useState(false);
  const label = kind === 'expense' ? 'Spent' : 'Earned';
  const present = () => {
    haptic('selection');
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: [...OPTIONS.map((o) => o.label), 'Cancel'], cancelButtonIndex: OPTIONS.length, userInterfaceStyle: scheme },
        (index) => {
          const option = OPTIONS[index];
          if (option) onChange(option.value);
        },
      );
      return;
    }
    setOpen(true);
  };
  return (
    <>
      <Pressable
        role="button"
        accessibilityLabel={`${label}, change between spent and earned`}
        scale={0.97}
        onPress={present}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        className="h-8 flex-row items-center gap-1 self-start rounded-full bg-accent-soft pl-3 pr-2.5"
      >
        <Text variant="callout" tone="accent">
          {label}
        </Text>
        <View>
          <SymbolIcon name="chevron.down" size={11} color={colors.accent} weight="semibold" />
        </View>
      </Pressable>
      {Platform.OS === 'ios' ? null : (
        <OptionPicker visible={open} title="Show" options={OPTIONS} selected={kind} onSelect={onChange} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

export { KindMenu };
