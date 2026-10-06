import * as React from 'react';
import { StyleSheet, View } from 'react-native';

import { OptionPicker, type Option } from '@/components/app/option-picker';
import { ListRow } from '@/components/app/list-group';
import { Text } from '@/components/ui/text';
import { useTokens } from '@/theme/use-tokens';

type Injected = { showSeparator?: boolean };

type FormRowProps = Injected & {
  label: string;
  children: React.ReactNode;
  /** Stacks the control under the label instead of beside it. */
  stacked?: boolean;
  minHeight?: number;
};

/** A grouped-list row holding an arbitrary control; takes part in ListGroup separators. */
function FormRow({ label, children, stacked = false, minHeight = 52, showSeparator = false }: FormRowProps) {
  const { colors } = useTokens();
  return (
    <View className={stacked ? 'gap-2 bg-surface px-4 py-3' : 'flex-row items-center justify-between gap-3 bg-surface px-4'} style={{ minHeight }}>
      <Text variant="body">{label}</Text>
      {children}
      {showSeparator ? (
        <View pointerEvents="none" style={{ left: 16, height: StyleSheet.hairlineWidth, backgroundColor: colors.separator }} className="absolute bottom-0 right-0" />
      ) : null}
    </View>
  );
}

type PickRowProps<T extends string | number | null> = Injected & {
  label: string;
  value: string;
  title?: string;
  options: readonly Option<T>[];
  selected: T;
  onSelect: (value: T) => void;
  disabled?: boolean;
};

/** Row with a trailing value that opens the shared option picker. */
function PickRow<T extends string | number | null>({ label, value, title, options, selected, onSelect, disabled = false, showSeparator }: PickRowProps<T>) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <ListRow label={label} value={value} chevron={!disabled} showSeparator={showSeparator} onPress={disabled ? undefined : () => setOpen(true)} />
      <OptionPicker visible={open} title={title ?? label} options={options} selected={selected} onSelect={onSelect} onClose={() => setOpen(false)} />
    </>
  );
}

export { FormRow, PickRow };
