import { CurrencyMismatchError, type CurrencyCode, type Money } from '../money'
import { stableId } from './id'
import type { Account, Workspace } from './types'

export class UnknownAccountError extends Error {
  constructor(id: string) {
    super(`No account with id ${id}`)
    this.name = 'UnknownAccountError'
  }
}

export class DuplicateAccountError extends Error {
  constructor(id: string) {
    super(`An account with id ${id} already exists`)
    this.name = 'DuplicateAccountError'
  }
}

export class NotAManualAccountError extends Error {
  constructor(id: string) {
    super(`Account ${id} was imported and cannot be edited by hand`)
    this.name = 'NotAManualAccountError'
  }
}

function requireAccount(workspace: Workspace, accountId: string): Account {
  const account = workspace.accounts.find((entry) => entry.id === accountId)
  if (!account) throw new UnknownAccountError(accountId)
  return account
}

function assertDisplayCurrency(workspace: Workspace, currency: CurrencyCode): void {
  if (currency !== workspace.displayCurrency) {
    throw new CurrencyMismatchError(workspace.displayCurrency, currency)
  }
}

export function renameAccount(workspace: Workspace, accountId: string, label: string): Workspace {
  requireAccount(workspace, accountId)
  return {
    ...workspace,
    accounts: workspace.accounts.map((entry) =>
      entry.id === accountId ? { ...entry, label } : entry,
    ),
  }
}

export function addManualAccount(workspace: Workspace, label: string, balance: Money): Workspace {
  assertDisplayCurrency(workspace, balance.currency)

  const id = stableId('account', 'manual', label)
  if (workspace.accounts.some((entry) => entry.id === id)) {
    throw new DuplicateAccountError(id)
  }

  const account: Account = {
    id,
    label,
    institution: 'Manual',
    reference: '',
    currency: balance.currency,
    source: 'manual',
    openingBalance: balance,
    closingBalance: balance,
  }

  return { ...workspace, accounts: [...workspace.accounts, account] }
}

export function setManualBalance(
  workspace: Workspace,
  accountId: string,
  balance: Money,
): Workspace {
  const account = requireAccount(workspace, accountId)
  if (account.source !== 'manual') throw new NotAManualAccountError(accountId)
  assertDisplayCurrency(workspace, balance.currency)

  return {
    ...workspace,
    accounts: workspace.accounts.map((entry) =>
      entry.id === accountId
        ? { ...entry, openingBalance: balance, closingBalance: balance }
        : entry,
    ),
  }
}

export function removeAccount(workspace: Workspace, accountId: string): Workspace {
  requireAccount(workspace, accountId)

  const transactions = workspace.transactions.filter((entry) => entry.accountId !== accountId)
  const remainingCounterpartyIds = new Set(transactions.map((entry) => entry.counterpartyId))

  return {
    ...workspace,
    accounts: workspace.accounts.filter((entry) => entry.id !== accountId),
    transactions,
    counterparties: workspace.counterparties.filter((entry) =>
      remainingCounterpartyIds.has(entry.id),
    ),
  }
}
