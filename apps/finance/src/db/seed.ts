import { count } from "drizzle-orm";
import { newId } from "@studio/data";
import { categories, type NewCategory } from "./schema";
import type { Db } from "./types";
import {
  getSetting,
  insertMissingDefaults,
  setSetting,
} from "./repos/settings";

interface SeedCategory {
  name: string;
  icon: string;
  color: string;
  /** Default group; migration 0002 applies the same mapping to existing installs. */
  groupName?: string;
}

export const EXPENSE_CATEGORIES: readonly SeedCategory[] = [
  {
    name: "Food & Drink",
    icon: "fork.knife",
    color: "red",
    groupName: "Lifestyle",
  },
  {
    name: "Groceries",
    icon: "cart.fill",
    color: "green",
    groupName: "Essentials",
  },
  {
    name: "Transport",
    icon: "car.fill",
    color: "blue",
    groupName: "Essentials",
  },
  { name: "Shopping", icon: "bag.fill", color: "pink", groupName: "Lifestyle" },
  {
    name: "Housing",
    icon: "house.fill",
    color: "brown",
    groupName: "Essentials",
  },
  { name: "Bills", icon: "bolt.fill", color: "amber", groupName: "Essentials" },
  {
    name: "Subscriptions",
    icon: "arrow.triangle.2.circlepath",
    color: "indigo",
    groupName: "Lifestyle",
  },
  {
    name: "Health",
    icon: "cross.case.fill",
    color: "teal",
    groupName: "Essentials",
  },
  {
    name: "Entertainment",
    icon: "play.rectangle.fill",
    color: "purple",
    groupName: "Lifestyle",
  },
  { name: "Travel", icon: "airplane", color: "cyan", groupName: "Lifestyle" },
  {
    name: "Education",
    icon: "book.fill",
    color: "orange",
    groupName: "Essentials",
  },
  { name: "Personal", icon: "sparkles", color: "lime", groupName: "Lifestyle" },
  { name: "Other", icon: "ellipsis.circle.fill", color: "gray" },
];

export const INCOME_CATEGORIES: readonly SeedCategory[] = [
  { name: "Salary", icon: "banknote.fill", color: "green", groupName: "Work" },
  {
    name: "Freelance",
    icon: "laptopcomputer",
    color: "blue",
    groupName: "Work",
  },
  { name: "Investments", icon: "chart.line.uptrend.xyaxis", color: "teal" },
  { name: "Refunds", icon: "arrow.uturn.backward.circle.fill", color: "cyan" },
  { name: "Gifts", icon: "gift.fill", color: "pink" },
  { name: "Other income", icon: "plus.circle.fill", color: "gray" },
];

/** Idempotent: categories are inserted once (guarded by `schema_seeded`), missing settings are filled in. */
export function seedDefaults(db: Db, now = Date.now()): void {
  db.transaction((tx) => {
    insertMissingDefaults(tx);
    if (getSetting(tx, "schema_seeded")) return;
    const existing = tx.select({ n: count() }).from(categories).get()?.n ?? 0;
    if (existing === 0) tx.insert(categories).values(seedRows(now)).run();
    setSetting(tx, "schema_seeded", true);
  });
}

function seedRows(now: number): NewCategory[] {
  const rows: NewCategory[] = [];
  const add = (kind: "expense" | "income", list: readonly SeedCategory[]) =>
    list.forEach((c, sortOrder) =>
      rows.push({
        id: newId(),
        kind,
        sortOrder,
        createdAt: now,
        updatedAt: now,
        ...c,
      }),
    );
  add("expense", EXPENSE_CATEGORIES);
  add("income", INCOME_CATEGORIES);
  return rows;
}
