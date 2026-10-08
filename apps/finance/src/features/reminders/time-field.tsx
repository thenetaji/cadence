import DateTimePicker from "@react-native-community/datetimepicker";
import * as React from "react";

import { useTokens } from "@studio/theme";

import { fromTime, toTime } from "./time";

type TimeFieldProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

/** Native compact time picker (iOS pill, Android dialog); the web build swaps in an `<input type=time>`. */
export function TimeField({ value, onChange, disabled }: TimeFieldProps) {
  const { isDark } = useTokens();
  return (
    <DateTimePicker
      mode="time"
      display="compact"
      value={fromTime(value)}
      disabled={disabled}
      themeVariant={isDark ? "dark" : "light"}
      onChange={(_, date) => {
        if (date) onChange(toTime(date));
      }}
    />
  );
}
