import { getCategory } from '@/db/repos/categories';
import { spendLines } from '@/db/repos/reports';
import type { CategoryRow } from '@/db/schema';
import type { Db } from '@/db/types';
import { previousPeriod, type Period } from '@studio/dates';
import { sumLines } from '@/lib/insights';
import { conversionContext } from './summary';

export interface TrendPoint {
  period: Period;
  /** Display-currency minor units attributed to the category (split lines included). */
  amount: number;
}

export interface CategoryTrend {
  currency: string;
  category: CategoryRow | null;
  /** Oldest first; the last entry is `period`. */
  points: TrendPoint[];
  /** Mean of the points, rounded half up. */
  average: number;
}

/** The `count` periods ending at `period`, oldest first. */
export function trailingPeriods(period: Period, count: number): Period[] {
  const out: Period[] = [period];
  for (let i = 1; i < count; i++) out.unshift(previousPeriod(out[0] as Period));
  return out;
}

export function readCategoryTrend(db: Db, categoryId: string, period: Period, kind: 'expense' | 'income', count = 6): CategoryTrend {
  const ctx = conversionContext(db);
  const periods = trailingPeriods(period, count);
  const first = periods[0] as Period;
  const lines = spendLines(db, { from: first.from, to: period.to }).filter((l) => l.categoryId === categoryId);
  const points = periods.map((p) => ({ period: p, amount: sumLines(lines, kind, p, ctx) }));
  const total = points.reduce((sum, p) => sum + p.amount, 0);
  return {
    currency: ctx.displayCurrency,
    category: getCategory(db, categoryId) ?? null,
    points,
    average: points.length === 0 ? 0 : Math.floor((total * 2 + points.length) / (points.length * 2)),
  };
}
