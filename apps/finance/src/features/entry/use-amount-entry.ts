import * as React from 'react';

import type { KeypadKey } from '@/components/app/keypad';
import { createKeypadState, deriveKeypad, keypadReducer, type KeypadState, type KeypadView } from '@/lib/keypad';

export interface AmountEntry {
  state: KeypadState;
  view: KeypadView;
  /** Non-negative minor units of the expression typed so far. */
  total: number;
  press: (key: KeypadKey) => void;
  clear: () => void;
  /** Restarts the keypad for a currency with `digits` decimals, holding `minor`. */
  reset: (digits: number, minor: number) => void;
}

/** Keypad state for one amount field; `onChange` receives the clamped total after every key. */
export function useAmountEntry(digits: number, initialMinor: number, onChange: (minor: number) => void): AmountEntry {
  const [state, setState] = React.useState<KeypadState>(() => createKeypadState(digits, initialMinor));
  const view = deriveKeypad(state);

  const apply = (next: KeypadState) => {
    setState(next);
    onChange(Math.max(deriveKeypad(next).total, 0));
  };

  return {
    state,
    view,
    total: Math.max(view.total, 0),
    press: (key) => apply(keypadReducer(state, key === 'backspace' ? 'back' : key)),
    clear: () => apply(keypadReducer(state, 'clear')),
    reset: (nextDigits, minor) => setState(createKeypadState(nextDigits, minor)),
  };
}
