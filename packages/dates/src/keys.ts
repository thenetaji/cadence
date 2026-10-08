/** Calendar arithmetic on 'YYYY-MM-DD' keys. Uses UTC internally so DST never shifts a day. */

export type DateKey = string;

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

export function makeKey(year: number, month: number, day: number): DateKey {
  return `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
}

export interface KeyParts {
  year: number;
  month: number;
  day: number;
}

export function parseKey(key: DateKey): KeyParts {
  const [y = "1970", m = "1", d = "1"] = key.split("-");
  return { year: Number(y), month: Number(m), day: Number(d) };
}

export function toDateKey(value: Date | number): DateKey {
  const date = typeof value === "number" ? new Date(value) : value;
  return makeKey(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function utcMs(key: DateKey): number {
  const { year, month, day } = parseKey(key);
  return Date.UTC(year, month - 1, day);
}

function fromUtcMs(ms: number): DateKey {
  const d = new Date(ms);
  return makeKey(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

export function addDays(key: DateKey, days: number): DateKey {
  return fromUtcMs(utcMs(key) + days * 86_400_000);
}

/** Adds months keeping the day-of-month, clamped to the target month's length. */
export function addMonths(key: DateKey, months: number): DateKey {
  const { year, month, day } = parseKey(key);
  const index = year * 12 + (month - 1) + months;
  const y = Math.floor(index / 12);
  const m = (index % 12) + 1;
  return makeKey(y, m, Math.min(day, daysInMonth(y, m)));
}

export function diffDays(from: DateKey, to: DateKey): number {
  return Math.round((utcMs(to) - utcMs(from)) / 86_400_000);
}

/** ISO weekday: Monday = 1 ... Sunday = 7. */
export function weekday(key: DateKey): number {
  const dow = new Date(utcMs(key)).getUTCDay();
  return dow === 0 ? 7 : dow;
}

export function endOfMonthKey(key: DateKey): DateKey {
  const { year, month } = parseKey(key);
  return makeKey(year, month, daysInMonth(year, month));
}

export function listDays(from: DateKey, to: DateKey): DateKey[] {
  const out: DateKey[] = [];
  for (let k = from; k <= to; k = addDays(k, 1)) out.push(k);
  return out;
}

/** Local wall-clock timestamp for a key; used for "09:00 local" postings. */
export function keyToLocalMs(key: DateKey, hour = 0, minute = 0): number {
  const { year, month, day } = parseKey(key);
  return new Date(year, month - 1, day, hour, minute).getTime();
}

/** Inclusive bounds covering every possible date key, for "all time" queries. */
export const ALL_DATES = { from: "0000-01-01", to: "9999-12-31" } as const;
