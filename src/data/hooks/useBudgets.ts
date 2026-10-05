import { listBudgetProgress, type BudgetSpent } from '@/db/repos/budgets';
import { useTodayKey } from './useTodayKey';
import { useLiveData } from '../use-live-data';

/** Progress for every active budget in its own period containing `ref` (a date key; defaults to today). */
export function useBudgets(ref?: string): BudgetSpent[] {
  const today = useTodayKey();
  const key = ref ?? today;
  return useLiveData(['budgets', 'budget_categories', 'transactions', 'transaction_splits', 'fx_rates'], key, (db) =>
    listBudgetProgress(db, key),
  );
}
