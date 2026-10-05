export type ValidationCode =
  | 'amount_not_positive'
  | 'amount_not_integer'
  | 'split_count'
  | 'split_sum_mismatch'
  | 'split_amount_not_positive'
  | 'category_required'
  | 'transfer_needs_two_accounts'
  | 'transfer_amount_required'
  | 'account_not_found'
  | 'category_not_found'
  | 'not_found'
  | 'target_required'
  | 'target_kind_mismatch'
  | 'currency_mismatch'
  | 'transfer_conflict'
  | 'invalid_input';

export class ValidationError extends Error {
  readonly code: ValidationCode;

  constructor(code: ValidationCode, message?: string) {
    super(message ?? code);
    this.name = 'ValidationError';
    this.code = code;
  }
}
