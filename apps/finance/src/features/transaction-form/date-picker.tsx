import DateTimePicker from '@react-native-community/datetimepicker';

import { useTokens } from '@/theme/use-tokens';

type DatePickerProps = {
  value: number;
  onChange: (ms: number) => void;
  mode?: 'date' | 'datetime';
  display?: 'inline' | 'compact';
  minimumDate?: number;
};

function DatePicker({ value, onChange, mode = 'datetime', display = 'inline', minimumDate }: DatePickerProps) {
  const { colors, scheme } = useTokens();
  return (
    <DateTimePicker
      value={new Date(value)}
      mode={mode}
      display={display}
      themeVariant={scheme}
      accentColor={colors.accent}
      minimumDate={minimumDate === undefined ? undefined : new Date(minimumDate)}
      onChange={(_event, date) => {
        if (date) onChange(date.getTime());
      }}
    />
  );
}

export { DatePicker };
export type { DatePickerProps };
