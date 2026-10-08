import * as React from "react";

/** The latest non-null value, kept while `value` is null, so a fading label stays where it was. */
export function useHeld(value: number | null): number {
  const [held, setHeld] = React.useState(value ?? 0);
  if (value !== null && value !== held) setHeld(value);
  return value ?? held;
}
