/** Splitting a formatted amount into odometer columns (digits) and fixed glyphs (everything else). */

export type NumberToken =
  | { kind: "digit"; digit: number; key: string }
  | { kind: "static"; char: string; key: string };

export type Align = "right" | "left";

const isDigit = (ch: string) => ch >= "0" && ch <= "9";

/**
 * `right` keys every column by its place from the end, so `1,240` -> `12,400` keeps the units
 * column in place and the rest roll. `left` keys by order from the start, which is what typing
 * wants: appending a digit adds one column and leaves the others alone.
 */
export function splitNumber(
  text: string,
  align: Align = "right",
): NumberToken[] {
  const chars = Array.from(text);
  const tokens: NumberToken[] = [];
  let digits = 0;
  let statics = 0;
  const order = align === "right" ? [...chars].reverse() : chars;
  for (const ch of order) {
    if (isDigit(ch))
      tokens.push({ kind: "digit", digit: Number(ch), key: `d${digits++}` });
    else tokens.push({ kind: "static", char: ch, key: `s${statics++}` });
  }
  return align === "right" ? tokens.reverse() : tokens;
}

/** Keys present in `next` but not `prev`: the columns that must animate in. */
export function addedKeys(
  prev: readonly NumberToken[],
  next: readonly NumberToken[],
): string[] {
  const before = new Set(prev.map((t) => t.key));
  return next.filter((t) => !before.has(t.key)).map((t) => t.key);
}

/** Columns whose digit differs between two renders (the ones that roll). */
export function changedDigits(
  prev: readonly NumberToken[],
  next: readonly NumberToken[],
): string[] {
  const before = new Map(prev.map((t) => [t.key, t] as const));
  return next
    .filter((t) => {
      const old = before.get(t.key);
      return (
        t.kind === "digit" && old?.kind === "digit" && old.digit !== t.digit
      );
    })
    .map((t) => t.key);
}

/** Intro delay for a column: leftmost settles first, each following one a little later. */
export function introDelay(orderFromLeft: number, step = 40, cap = 8): number {
  return Math.min(orderFromLeft, cap) * step;
}
