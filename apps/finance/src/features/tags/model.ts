import { categoryKeys, withAlpha, type CategoryColorKey } from "@studio/theme";

/** Colours a new tag can take; gray is left for categories. */
export const TAG_COLORS: readonly CategoryColorKey[] = categoryKeys.filter(
  (key) => key !== "gray" && key !== "brown",
);

export const isTagColor = (value: string): value is CategoryColorKey =>
  (categoryKeys as readonly string[]).includes(value);

/** Palette key for a stored tag colour; unknown values read as gray. */
export const tagColorKey = (value: string): CategoryColorKey =>
  isTagColor(value) ? value : "gray";

/** Pill colours from a resolved palette hex: text and dot in the colour, a soft tint behind. */
export function tagPillColors(hex: string): {
  fg: string;
  bg: string;
  ring: string;
} {
  return { fg: hex, bg: withAlpha(hex, 0.16), ring: withAlpha(hex, 0.45) };
}

/** First palette colour no existing tag uses, then cycling. */
export function nextTagColor(
  existing: readonly { color: string }[],
): CategoryColorKey {
  const used = new Set(existing.map((t) => t.color));
  return (
    TAG_COLORS.find((c) => !used.has(c)) ??
    TAG_COLORS[existing.length % TAG_COLORS.length] ??
    "blue"
  );
}

/** Case-insensitive match for the create row: true when `query` is non-empty and no tag has that exact name. */
export function canCreateTag(
  query: string,
  tags: readonly { name: string }[],
): boolean {
  const clean = query.trim().replace(/\s+/g, " ").toLowerCase();
  return clean !== "" && !tags.some((t) => t.name.toLowerCase() === clean);
}

export const matchesQuery = (name: string, query: string): boolean =>
  name.toLowerCase().includes(query.trim().toLowerCase());

export interface BreakdownRow {
  id: string;
  name: string;
  color: string;
  icon: string;
  amount: number;
  /** 0-1 of the largest row, for bar length. */
  share: number;
}

interface BreakdownItem {
  kind: string;
  amount: number;
  currency: string;
  category: { id: string; name: string; color: string; icon: string } | null;
  splits: readonly {
    amount: number;
    category: { id: string; name: string; color: string; icon: string };
  }[];
}

/** Expense spend per category in the display currency, biggest first; split lines count under their own category. */
export function categoryBreakdown(
  items: readonly BreakdownItem[],
  convert: (minor: number, currency: string) => number,
): BreakdownRow[] {
  const byCategory = new Map<string, Omit<BreakdownRow, "share">>();
  const add = (
    category: { id: string; name: string; color: string; icon: string },
    minor: number,
    currency: string,
  ) => {
    const row = byCategory.get(category.id) ?? {
      id: category.id,
      name: category.name,
      color: category.color,
      icon: category.icon,
      amount: 0,
    };
    row.amount += convert(minor, currency);
    byCategory.set(category.id, row);
  };
  for (const item of items) {
    if (item.kind !== "expense") continue;
    if (item.splits.length > 1)
      for (const line of item.splits)
        add(line.category, line.amount, item.currency);
    else if (item.category) add(item.category, item.amount, item.currency);
  }
  const rows = [...byCategory.values()].sort(
    (a, b) => b.amount - a.amount || a.name.localeCompare(b.name),
  );
  const top = rows[0]?.amount ?? 0;
  return rows.map((row) => ({ ...row, share: top > 0 ? row.amount / top : 0 }));
}
