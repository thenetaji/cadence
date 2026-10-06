/** Every transaction kind. The four lending kinds move money to or from a person, never a category. */
export type TransactionKind =
  | 'expense'
  | 'income'
  | 'transfer'
  | 'lent'
  | 'borrowed'
  | 'repaid_to_me'
  | 'repaid_by_me';

export type LendingKind = 'lent' | 'borrowed' | 'repaid_to_me' | 'repaid_by_me';
/** Kinds a recurring rule can post. */
export type RecurringKind = 'expense' | 'income' | 'transfer';

export const LENDING_KINDS: readonly LendingKind[] = ['lent', 'borrowed', 'repaid_to_me', 'repaid_by_me'];
export const ALL_KINDS: readonly TransactionKind[] = ['expense', 'income', 'transfer', ...LENDING_KINDS];

/** Money arriving in the account. Transfers are handled separately (out of one account, into another). */
export const INFLOW_KINDS: readonly TransactionKind[] = ['income', 'borrowed', 'repaid_to_me'];
/** Money leaving the account (a transfer's source side included). */
export const OUTFLOW_KINDS: readonly TransactionKind[] = ['expense', 'lent', 'repaid_by_me', 'transfer'];

export function isLendingKind(kind: string): kind is LendingKind {
  return (LENDING_KINDS as readonly string[]).includes(kind);
}

/** True for kinds that count towards spend and income summaries (everything else is excluded). */
export function isSpendKind(kind: string): kind is 'expense' | 'income' {
  return kind === 'expense' || kind === 'income';
}

/** +1 when the kind adds to what a person owes me, -1 when it reduces it, 0 for non-lending kinds. */
export function owedDelta(kind: string): 1 | -1 | 0 {
  switch (kind) {
    case 'lent':
    case 'repaid_by_me':
      return 1;
    case 'borrowed':
    case 'repaid_to_me':
      return -1;
    default:
      return 0;
  }
}

/** Sign shown before an amount in lists: money in is plus, money out is minus, transfers none. */
export function amountSign(kind: TransactionKind): 'plus' | 'minus' | 'none' {
  if (kind === 'transfer') return 'none';
  return accountDirection(kind) === 1 ? 'plus' : 'minus';
}

/** Effect on the source account's balance: +1 in, -1 out. */
export function accountDirection(kind: TransactionKind): 1 | -1 {
  return (INFLOW_KINDS as readonly string[]).includes(kind) ? 1 : -1;
}
