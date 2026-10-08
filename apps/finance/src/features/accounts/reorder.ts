/** Moves one item to a new index; out-of-range targets clamp, no-ops return the same array. */
export function moveItem<T>(
  items: readonly T[],
  from: number,
  to: number,
): T[] {
  if (from < 0 || from >= items.length) return [...items];
  const target = Math.min(Math.max(to, 0), items.length - 1);
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(target, 0, moved as T);
  return next;
}

/** The slot a dragged row of `rowHeight` lands in after being moved `translation` from slot `from`. */
export function slotFor(
  from: number,
  translation: number,
  rowHeight: number,
  count: number,
): number {
  "worklet";
  return Math.min(
    Math.max(from + Math.round(translation / rowHeight), 0),
    count - 1,
  );
}

/** Order after each id's slot is known: ids sorted by slot. */
export function orderBySlots(
  slots: Readonly<Record<string, number>>,
): string[] {
  return Object.keys(slots).sort((a, b) => (slots[a] ?? 0) - (slots[b] ?? 0));
}

/** Slot map after `id` is dragged into `slot`; the rows it passes shift by one. */
export function reslot(
  slots: Readonly<Record<string, number>>,
  id: string,
  slot: number,
): Record<string, number> {
  "worklet";
  const current = slots[id];
  if (current === undefined || current === slot) return { ...slots };
  const next: Record<string, number> = {};
  for (const key of Object.keys(slots)) {
    const value = slots[key] ?? 0;
    if (key === id) next[key] = slot;
    else if (current < slot && value > current && value <= slot)
      next[key] = value - 1;
    else if (current > slot && value >= slot && value < current)
      next[key] = value + 1;
    else next[key] = value;
  }
  return next;
}
