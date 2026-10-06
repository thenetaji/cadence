import type { DonutDatum } from '@/components/charts/donut';
import type { Insights } from '@/data/hooks';
import { formatMoney } from '@studio/money';
import type { CategoryColorKey, Scheme } from '@studio/theme';
import { categoryColors, categoryKeys } from '@studio/theme';

import type { CategoryListItem } from './category-list';

export const OTHER_KEY = 'other';
export const NONE_KEY = 'none';

const asColor = (value: string | undefined): CategoryColorKey => ((categoryKeys as readonly string[]).includes(value ?? '') ? (value as CategoryColorKey) : 'gray');

interface Keyed {
  categoryId: string | null;
  isOther?: boolean;
}

export const donutKey = (row: Keyed): string => (row.isOther ? OTHER_KEY : (row.categoryId ?? NONE_KEY));

export interface Formatting {
  currency: string;
  locale?: string;
  showDecimals: boolean;
  scheme: Scheme;
}

export function donutData(insights: Insights, fmt: Formatting): DonutDatum[] {
  return insights.donut.map((row) => {
    const colorKey = row.isOther ? 'gray' : asColor(row.category?.color);
    return {
      key: donutKey(row),
      name: row.isOther ? 'Other' : (row.category?.name ?? 'Uncategorised'),
      value: row.amount,
      amountLabel: formatMoney(row.amount, fmt.currency, { locale: fmt.locale, decimals: fmt.showDecimals ? undefined : 0 }),
      percentLabel: `${row.percent}%`,
      color: categoryColors[fmt.scheme][colorKey],
    };
  });
}

/** Category rows, optionally limited to the donut selection ("other" = everything outside the top 8). */
export function listItems(insights: Insights, selectedKey: string | null): CategoryListItem[] {
  const topIds = new Set(insights.donut.filter((d) => !d.isOther).map((d) => d.categoryId));
  return insights.categories
    .filter((row) => {
      if (selectedKey === null) return true;
      if (selectedKey === OTHER_KEY) return !topIds.has(row.categoryId);
      return donutKey(row) === selectedKey;
    })
    .map((row) => ({
      id: row.categoryId,
      name: row.category?.name ?? 'Uncategorised',
      icon: row.category?.icon ?? 'tag.fill',
      color: asColor(row.category?.color),
      amount: row.amount,
      percent: row.percent,
    }));
}

/** Resolves `?select=<name>` against the donut, case-insensitively. */
export function keyForName(insights: Insights, name: string): string | null {
  const wanted = name.trim().toLowerCase();
  const hit = insights.donut.find((row) => (row.isOther ? 'other' : (row.category?.name ?? 'uncategorised').toLowerCase()) === wanted);
  return hit ? donutKey(hit) : null;
}

/** "Spending by category: Food 34%, Transport 21%". */
export function summaryLabel(insights: Insights, kind: 'expense' | 'income'): string {
  const head = kind === 'expense' ? 'Spending by category' : 'Income by category';
  if (insights.total === 0) return `${head}: nothing in this period`;
  return `${head}: ${insights.donut.map((row) => `${row.isOther ? 'Other' : (row.category?.name ?? 'Uncategorised')} ${row.percent}%`).join(', ')}`;
}
