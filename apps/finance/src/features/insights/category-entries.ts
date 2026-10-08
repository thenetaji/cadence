import type { TransactionListItem } from "@/data/hooks";
import { dayLabel } from "@studio/dates";

export type CategoryEntry =
  | { type: "header"; key: string; label: string }
  | { type: "row"; key: string; item: TransactionListItem; last: boolean }
  | {
      type: "split";
      key: string;
      item: TransactionListItem;
      line: TransactionListItem["splits"][number];
      last: boolean;
    };

/**
 * Day-grouped entries for one category. A split transaction contributes one row per line that
 * belongs to the category (carrying the parent title); plain transactions are a single row.
 */
export function buildCategoryEntries(
  items: readonly TransactionListItem[],
  categoryId: string,
  todayKey: string,
): CategoryEntry[] {
  type Row = {
    key: string;
    item: TransactionListItem;
    line?: TransactionListItem["splits"][number];
  };
  const byDay = new Map<string, Row[]>();
  for (const item of items) {
    if (item.kind === "transfer") continue;
    const rows: Row[] = item.isSplit
      ? item.splits
          .filter((line) => line.categoryId === categoryId)
          .map((line) => ({ key: `${item.id}:${line.id}`, item, line }))
      : [{ key: item.id, item }];
    if (rows.length === 0) continue;
    const day = byDay.get(item.dateKey) ?? [];
    day.push(...rows);
    byDay.set(item.dateKey, day);
  }
  const out: CategoryEntry[] = [];
  for (const [dateKey, rows] of byDay) {
    out.push({
      type: "header",
      key: `h:${dateKey}`,
      label: dayLabel(dateKey, todayKey),
    });
    rows.forEach((row, index) => {
      const last = index === rows.length - 1;
      out.push(
        row.line
          ? {
              type: "split",
              key: row.key,
              item: row.item,
              line: row.line,
              last,
            }
          : { type: "row", key: row.key, item: row.item, last },
      );
    });
  }
  return out;
}
