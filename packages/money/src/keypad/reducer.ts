import { groupInteger, resolveNumberLocale } from "../locales";

export const MAX_INTEGER_DIGITS = 12;

export type KeypadKey =
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "00"
  | "."
  | "back"
  | "clear"
  | "+"
  | "-"
  | "=";

type Operator = "+" | "-";

interface Term {
  /** Operator that precedes this term in the expression. */
  op: Operator;
  value: number;
}

export interface KeypadState {
  minorDigits: number;
  terms: readonly Term[];
  pendingOp: Operator | null;
  /** Integer digits of the entry being typed; '' when nothing typed. */
  int: string;
  frac: string;
  dot: boolean;
}

const pow10 = (n: number) => 10 ** n;
const maxMinor = (digits: number) => pow10(MAX_INTEGER_DIGITS + digits) - 1;

export function createKeypadState(
  minorDigits: number,
  initialMinor = 0,
): KeypadState {
  return entryFromMinor(
    { minorDigits, terms: [], pendingOp: null, int: "", frac: "", dot: false },
    initialMinor,
  );
}

function entryFromMinor(state: KeypadState, minor: number): KeypadState {
  const value = Math.min(
    Math.max(Math.trunc(minor), 0),
    maxMinor(state.minorDigits),
  );
  if (value === 0) return { ...state, int: "", frac: "", dot: false };
  const unit = pow10(state.minorDigits);
  const int = String(Math.floor(value / unit));
  const frac =
    state.minorDigits > 0
      ? String(value % unit)
          .padStart(state.minorDigits, "0")
          .replace(/0+$/, "")
      : "";
  return { ...state, int, frac, dot: frac.length > 0 };
}

function entryMinor(state: KeypadState): number {
  const frac = state.frac.padEnd(state.minorDigits, "0");
  return Number(`${state.int || "0"}${frac}`);
}

const isEntryEmpty = (state: KeypadState) => state.int === "" && !state.dot;

function evaluate(state: KeypadState): number {
  const sum = state.terms.reduce(
    (acc, t) => (t.op === "+" ? acc + t.value : acc - t.value),
    0,
  );
  if (isEntryEmpty(state) && state.pendingOp !== null) return sum;
  const op = state.pendingOp ?? "+";
  return op === "+" ? sum + entryMinor(state) : sum - entryMinor(state);
}

function pressDigit(state: KeypadState, digit: string): KeypadState {
  if (state.dot) {
    return state.frac.length < state.minorDigits
      ? { ...state, frac: state.frac + digit }
      : state;
  }
  if (state.int === "0" || state.int === "") {
    return digit === "0" ? { ...state, int: "0" } : { ...state, int: digit };
  }
  return state.int.length < MAX_INTEGER_DIGITS
    ? { ...state, int: state.int + digit }
    : state;
}

function pressDot(state: KeypadState): KeypadState {
  if (state.minorDigits === 0 || state.dot) return state;
  return { ...state, dot: true, int: state.int === "" ? "0" : state.int };
}

function pressBack(state: KeypadState): KeypadState {
  if (state.dot) {
    return state.frac.length > 0
      ? { ...state, frac: state.frac.slice(0, -1) }
      : { ...state, dot: false };
  }
  if (state.int !== "") return { ...state, int: state.int.slice(0, -1) };
  const last = state.terms[state.terms.length - 1];
  if (state.pendingOp === null || !last) return state;
  const terms = state.terms.slice(0, -1);
  const restored = entryFromMinor({ ...state, terms }, last.value);
  return { ...restored, pendingOp: terms.length === 0 ? null : last.op };
}

function pressOperator(state: KeypadState, op: Operator): KeypadState {
  if (isEntryEmpty(state)) {
    return state.terms.length > 0 ? { ...state, pendingOp: op } : state;
  }
  const term: Term = { op: state.pendingOp ?? "+", value: entryMinor(state) };
  return {
    ...state,
    terms: [...state.terms, term],
    pendingOp: op,
    int: "",
    frac: "",
    dot: false,
  };
}

function pressEquals(state: KeypadState): KeypadState {
  if (state.pendingOp === null && state.terms.length === 0) return state;
  const base: KeypadState = { ...state, terms: [], pendingOp: null };
  return entryFromMinor(base, evaluate(state));
}

export function keypadReducer(state: KeypadState, key: KeypadKey): KeypadState {
  switch (key) {
    case "00":
      return pressDigit(pressDigit(state, "0"), "0");
    case ".":
      return pressDot(state);
    case "back":
      return pressBack(state);
    case "clear":
      return createKeypadState(state.minorDigits);
    case "+":
    case "-":
      return pressOperator(state, key);
    case "=":
      return pressEquals(state);
    default:
      return pressDigit(state, key);
  }
}

export interface KeypadView {
  /** Entry being typed, grouped for the locale; '0' when empty. */
  display: string;
  isEmpty: boolean;
  /** Completed terms and the pending operator, e.g. "1,200 + 350 −"; '' when none. */
  expression: string;
  /** Integer minor units of the whole expression, clamped to the 12-digit cap. */
  total: number;
  canSave: boolean;
  /** True when '=' should act as Save: nothing is pending. */
  equalsIsSave: boolean;
}

function formatMinorPlain(
  minor: number,
  digits: number,
  locale: ReturnType<typeof resolveNumberLocale>,
): string {
  const unit = pow10(digits);
  const int = groupInteger(String(Math.floor(Math.abs(minor) / unit)), locale);
  if (digits === 0) return int;
  const frac = String(Math.abs(minor) % unit)
    .padStart(digits, "0")
    .replace(/0+$/, "");
  return frac ? `${int}${locale.decimal}${frac}` : int;
}

export function deriveKeypad(
  state: KeypadState,
  localeTag?: string,
): KeypadView {
  const locale = resolveNumberLocale(localeTag);
  const empty = isEntryEmpty(state);
  const display =
    groupInteger(state.int === "" ? "0" : state.int, locale) +
    (state.dot ? `${locale.decimal}${state.frac}` : "");
  const operator = (op: Operator) => (op === "+" ? "+" : "−");
  const parts = state.terms.map((t, i) =>
    i === 0
      ? formatMinorPlain(t.value, state.minorDigits, locale)
      : `${operator(t.op)} ${formatMinorPlain(t.value, state.minorDigits, locale)}`,
  );
  if (state.pendingOp !== null) parts.push(operator(state.pendingOp));
  const total = Math.min(evaluate(state), maxMinor(state.minorDigits));
  return {
    display,
    isEmpty: empty,
    expression: parts.join(" "),
    total,
    canSave: total > 0,
    equalsIsSave: state.pendingOp === null,
  };
}
