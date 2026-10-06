import { asc, eq, inArray, isNull } from 'drizzle-orm';
import { periodFor, weekRange, yearRange, toDateKey, type Period } from '@studio/dates';
import { sumLines, type ConversionContext } from '@/lib/insights';
import { ValidationError } from '../errors';
import { newId } from '../ids';
import { budgetCategories, budgets, type BudgetPeriod, type BudgetRow, type BudgetScope } from '../schema';
import type { Db } from '../types';
import { getRateLookup } from './fx';
import { spendLines } from './reports';

export interface BudgetInput {
  name?: string;
  amount: number;
  currency: string;
  period: BudgetPeriod;
  /** Weekday 1-7 (weekly), day of month 1-28 (monthly) or month 1-12 (yearly). */
  startAnchor: number;
  scope: BudgetScope;
  categoryIds?: readonly string[];
}

export interface Budget extends BudgetRow {
  categoryIds: string[];
}

function validate(input: BudgetInput): void {
  if (!Number.isInteger(input.amount) || input.amount <= 0) throw new ValidationError('amount_not_positive');
  const bounds: Record<BudgetPeriod, [number, number]> = { weekly: [1, 7], monthly: [1, 28], yearly: [1, 12] };
  const [min, max] = bounds[input.period];
  if (!Number.isInteger(input.startAnchor) || input.startAnchor < min || input.startAnchor > max) {
    throw new ValidationError('invalid_input', 'start anchor out of range');
  }
  if (input.scope === 'categories' && (input.categoryIds?.length ?? 0) === 0) throw new ValidationError('category_required');
}

function withCategories(db: Db, rows: readonly BudgetRow[]): Budget[] {
  if (rows.length === 0) return [];
  const links = db
    .select()
    .from(budgetCategories)
    .where(inArray(budgetCategories.budgetId, rows.map((r) => r.id)))
    .all();
  return rows.map((row) => ({ ...row, categoryIds: links.filter((l) => l.budgetId === row.id).map((l) => l.categoryId) }));
}

function defaultName(input: BudgetInput): string {
  if (input.name?.trim()) return input.name.trim();
  return { weekly: 'Weekly budget', monthly: 'Monthly budget', yearly: 'Yearly budget' }[input.period];
}

function replaceScope(db: Db, budgetId: string, input: BudgetInput): void {
  db.delete(budgetCategories).where(eq(budgetCategories.budgetId, budgetId)).run();
  if (input.scope === 'categories' && input.categoryIds) {
    db.insert(budgetCategories)
      .values([...new Set(input.categoryIds)].map((categoryId) => ({ budgetId, categoryId })))
      .run();
  }
}

function assertSingleOverall(db: Db, input: BudgetInput, excludingId?: string): void {
  if (input.scope !== 'all') return;
  const clash = listBudgets(db).some((b) => b.scope === 'all' && b.period === input.period && b.id !== excludingId);
  if (clash) throw new ValidationError('invalid_input', 'only one all-spending budget per period type');
}

export function createBudget(db: Db, input: BudgetInput, now = Date.now()): Budget {
  validate(input);
  return db.transaction((tx) => {
    assertSingleOverall(tx, input);
    const row: BudgetRow = {
      id: newId(),
      name: defaultName(input),
      amount: input.amount,
      currency: input.currency.toUpperCase(),
      period: input.period,
      startAnchor: input.startAnchor,
      scope: input.scope,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    tx.insert(budgets).values(row).run();
    replaceScope(tx, row.id, input);
    return getBudget(tx, row.id) ?? { ...row, categoryIds: [] };
  });
}

export function updateBudget(db: Db, id: string, input: BudgetInput, now = Date.now()): void {
  validate(input);
  db.transaction((tx) => {
    if (!getBudget(tx, id)) throw new ValidationError('not_found');
    assertSingleOverall(tx, input, id);
    tx.update(budgets)
      .set({
        name: defaultName(input),
        amount: input.amount,
        currency: input.currency.toUpperCase(),
        period: input.period,
        startAnchor: input.startAnchor,
        scope: input.scope,
        updatedAt: now,
      })
      .where(eq(budgets.id, id))
      .run();
    replaceScope(tx, id, input);
  });
}

export function deleteBudget(db: Db, id: string): void {
  db.delete(budgets).where(eq(budgets.id, id)).run();
}

export function archiveBudget(db: Db, id: string, now = Date.now()): void {
  db.update(budgets).set({ archivedAt: now, updatedAt: now }).where(eq(budgets.id, id)).run();
}

export function getBudget(db: Db, id: string): Budget | undefined {
  const row = db.select().from(budgets).where(eq(budgets.id, id)).get();
  return row ? withCategories(db, [row])[0] : undefined;
}

export function listBudgets(db: Db): Budget[] {
  const rows = db.select().from(budgets).where(isNull(budgets.archivedAt)).orderBy(asc(budgets.createdAt)).all();
  return withCategories(db, rows);
}

/** The budget's own period containing `ref` (a date key). */
export function budgetPeriodFor(budget: Pick<BudgetRow, 'period' | 'startAnchor'>, ref: string): Period {
  if (budget.period === 'weekly') return { type: 'week', ...weekRange(ref, budget.startAnchor) };
  if (budget.period === 'monthly') return periodFor('month', ref, { weekStart: 1, monthStart: budget.startAnchor });
  return { type: 'year', ...yearRange(ref, budget.startAnchor) };
}

export interface BudgetSpent {
  budget: Budget;
  period: Period;
  /** In the budget's currency. */
  spent: number;
  remaining: number;
}

/** Expense lines in the period within scope, split lines counted by their own category; transfers never count. */
export function budgetSpent(db: Db, budget: Budget, period: Period): number {
  const lines = spendLines(db, period);
  const ctx: ConversionContext = { displayCurrency: budget.currency, rates: getRateLookup(db) };
  const scoped =
    budget.scope === 'all' ? lines : lines.filter((l) => l.categoryId !== null && budget.categoryIds.includes(l.categoryId));
  return sumLines(scoped, 'expense', period, ctx);
}

export function listBudgetProgress(db: Db, ref: string = toDateKey(Date.now())): BudgetSpent[] {
  return listBudgets(db).map((budget) => {
    const period = budgetPeriodFor(budget, ref);
    const spent = budgetSpent(db, budget, period);
    return { budget, period, spent, remaining: budget.amount - spent };
  });
}
