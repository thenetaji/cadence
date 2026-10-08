import * as React from "react";

import type { DatePickerProps } from "@/features/transaction-form/date-picker";

const pad = (n: number) => String(n).padStart(2, "0");

function toInput(ms: number, mode: "date" | "datetime"): string {
  const d = new Date(ms);
  const day = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return mode === "date"
    ? day
    : `${day}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Web QA fallback: the browser's own picker. */
function DatePicker({ value, onChange, mode = "datetime" }: DatePickerProps) {
  return React.createElement("input", {
    type: mode === "date" ? "date" : "datetime-local",
    value: toInput(value, mode),
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      const ms = new Date(event.target.value).getTime();
      if (!Number.isNaN(ms)) onChange(ms);
    },
    style: {
      font: "inherit",
      fontSize: 17,
      padding: 8,
      borderRadius: 10,
      border: "1px solid rgba(128,128,128,0.3)",
      background: "transparent",
      color: "inherit",
    },
  });
}

export { DatePicker };
