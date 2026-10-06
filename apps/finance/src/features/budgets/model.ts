import type { BudgetSpent } from '@/db/repos/budgets';
import type { BudgetPeriod, CategoryRow } from '@/db/schema';
import type { DateKey } from '@/lib/dates';
import { formatMoney, formatMoneyForSpeech } from '@/lib/money';
import type { CategoryColorKey } from '@/theme/tokens';

import { budgetRatio, budgetStatus, displayName, paceMarker, periodCaption, perDayLeft, type BudgetStatus } from './logic';

export interface BudgetFormat {
  locale?: string;
  showDecimals: boolean;
  todayKey: DateKey;
  categories: ReadonlyMap<string, CategoryRow>;
}

export interface BudgetView {
  id: string;
  name: string;
  scope: 'all' | 'categories';
  period: BudgetPeriod;
  icon: string;
  color: CategoryColorKey;
  ratio: number;
  /** Today's position in the period (0-1) for the pace tick; undefined for past or future periods. */
  marker?: number;
  /** Footnote title: "This month", or the month's name when not current. */
  caption: string;
  status: BudgetStatus;
  /** "₹17,600 left", or "₹2,400 over". */
  headline: string;
  /** "₹2,100 of ₹5,000". */
  progressText: string;
  /** "₹12,400 spent · ₹590/day left". */
  detail: string;
  accessibilityLabel: string;
}

const asColor = (value: string | undefined): CategoryColorKey => (value ?? 'gray') as CategoryColorKey;

/** Display strings for one budget over its current period. */
export function toBudgetView(progress: BudgetSpent, fmt: BudgetFormat, current = true): BudgetView {
  const { budget, period, spent, remaining } = progress;
  // Budgets are round targets; whole units keep them calm whatever the list setting.
  const decimals = 0;
  const money = (minor: number) => formatMoney(minor, budget.currency, { locale: fmt.locale, decimals });
  const spoken = (minor: number) => formatMoneyForSpeech(minor, budget.currency, { sign: 'none', locale: fmt.locale });
  const linked = budget.categoryIds.map((id) => fmt.categories.get(id)).filter((c): c is CategoryRow => !!c);
  const name = displayName(budget, linked.map((c) => c.name));
  const status = budgetStatus(spent, budget.amount);
  const over = remaining < 0;
  const perDay = perDayLeft(remaining, period, fmt.todayKey);
  const headline = over ? `${money(-remaining)} over` : `${money(remaining)} left`;
  const detail = over
    ? `${money(spent)} spent of ${money(budget.amount)}`
    : current
      ? `${money(spent)} spent · ${money(perDay)}/day left`
      : `${money(spent)} spent of ${money(budget.amount)}`;
  return {
    id: budget.id,
    name,
    scope: budget.scope,
    period: budget.period,
    icon: budget.scope === 'all' ? 'chart.pie.fill' : linked.length === 1 ? (linked[0]?.icon ?? 'tag.fill') : 'square.grid.2x2',
    color: budget.scope === 'all' ? 'blue' : asColor(linked[0]?.color),
    ratio: budgetRatio(spent, budget.amount),
    marker: current ? paceMarker(period, fmt.todayKey) : undefined,
    caption: periodCaption(budget.period, period, current),
    status,
    headline,
    progressText: `${money(spent)} of ${money(budget.amount)}`,
    detail,
    accessibilityLabel: `${name}, ${spoken(spent)} of ${spoken(budget.amount)}, ${over ? `${spoken(-remaining)} over` : `${spoken(remaining)} left`}`,
  };
}
