import { isNegative, isZero, type Money } from '../money'
import { UnknownAccountError } from './accounts'
import { recomputeBalances } from './balances'
import { stableId } from './id'
import { compareTransactions, counterpartyKey, nextSequence, normaliseName } from './merge'
import type {
  Channel,
  Counterparty,
  CounterpartyRole,
  Direction,
  IsoDate,
  Transaction,
  Workspace,
} from './types'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export class UnknownTransactionError extends Error {
  constructor(id: string) {
    super(`No transaction with id ${id}`)
    this.name = 'UnknownTransactionError'
  }
}

export class InvalidAmountError extends Error {
  constructor() {
    super('An amount must be greater than zero')
    this.name = 'InvalidAmountError'
  }
}

export class InvalidDateError extends Error {
  constructor(value: string) {
    super(`${JSON.stringify(value)} is not a date`)
    this.name = 'InvalidDateError'
  }
}

export class SameAccountTransferError extends Error {
  constructor() {
    super('A transfer needs two different accounts')
    this.name = 'SameAccountTransferError'
  }
}

export interface TransactionInput {
  accountId: string
  date: IsoDate
  direction: Direction
  /** Always the size of the movement. Which way it goes is `direction`. */
  amount: Money
  counterpartyName: string
  /** Sets the label on the name as the entry is written, for one typed in fresh. */
  role?: CounterpartyRole
  channel: Channel
  description: string
  note: string
  reference: string
}

export interface TransferInput {
  fromAccountId: string
  toAccountId: string
  date: IsoDate
  amount: Money
  note: string
}

function requireAccountId(workspace: Workspace, accountId: string): void {
  if (!workspace.accounts.some((entry) => entry.id === accountId)) {
    throw new UnknownAccountError(accountId)
  }
}

function requireAmount(amount: Money): void {
  if (isZero(amount) || isNegative(amount)) throw new InvalidAmountError()
}

function requireDate(date: IsoDate): void {
  if (!ISO_DATE.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
    throw new InvalidDateError(date)
  }
}

/** Finds the named party, or makes one, and hands back the id either way. */
export function resolveCounterparty(
  workspace: Workspace,
  name: string,
  role: CounterpartyRole = 'unassigned',
): { workspace: Workspace; counterpartyId: string } {
  const trimmed = name.trim() === '' ? 'Unnamed' : name.trim()
  const id = counterpartyKey(trimmed)
  const existing = workspace.counterparties.find((entry) => entry.id === id)

  if (existing) {
    if (role === 'unassigned' || existing.role === role) {
      return { workspace, counterpartyId: id }
    }
    return {
      workspace: {
        ...workspace,
        counterparties: workspace.counterparties.map((entry) =>
          entry.id === id ? { ...entry, role } : entry,
        ),
      },
      counterpartyId: id,
    }
  }

  const counterparty: Counterparty = {
    id,
    displayName: trimmed,
    role,
    aliases: [],
    note: '',
    dueDate: null,
  }

  return {
    workspace: {
      ...workspace,
      counterparties: [...workspace.counterparties, counterparty].sort((left, right) =>
        left.displayName.localeCompare(right.displayName),
      ),
    },
    counterpartyId: id,
  }
}

function freeTransactionId(taken: ReadonlySet<string>, ...parts: (string | number)[]): string {
  for (let ordinal = 0; ; ordinal += 1) {
    const id = stableId(...parts, 'manual', ordinal)
    if (!taken.has(id)) return id
  }
}

export function addTransaction(
  workspace: Workspace,
  input: TransactionInput,
): { workspace: Workspace; transaction: Transaction } {
  requireAccountId(workspace, input.accountId)
  requireAmount(input.amount)
  requireDate(input.date)

  const resolved = resolveCounterparty(workspace, input.counterpartyName, input.role)
  const taken = new Set(workspace.transactions.map((entry) => entry.id))

  const transaction: Transaction = {
    id: freeTransactionId(
      taken,
      input.accountId,
      input.date,
      input.direction,
      input.amount.minor,
      normaliseName(input.description),
    ),
    accountId: input.accountId,
    sequence: nextSequence(workspace.transactions, input.accountId),
    date: input.date,
    direction: input.direction,
    amount: input.amount,
    balance: null,
    channel: input.channel,
    counterpartyId: resolved.counterpartyId,
    description: input.description.trim() === '' ? input.counterpartyName.trim() : input.description,
    reference: input.reference,
    source: 'manual',
    note: input.note,
    transferId: null,
  }

  return {
    workspace: recomputeBalances({
      ...resolved.workspace,
      transactions: [...resolved.workspace.transactions, transaction].sort(compareTransactions),
    }),
    transaction,
  }
}

export function updateTransaction(
  workspace: Workspace,
  transactionId: string,
  patch: Partial<TransactionInput>,
): Workspace {
  const existing = workspace.transactions.find((entry) => entry.id === transactionId)
  if (!existing) throw new UnknownTransactionError(transactionId)

  if (patch.accountId !== undefined) requireAccountId(workspace, patch.accountId)
  if (patch.amount !== undefined) requireAmount(patch.amount)
  if (patch.date !== undefined) requireDate(patch.date)

  let current = workspace
  let counterpartyId = existing.counterpartyId
  if (patch.counterpartyName !== undefined) {
    const resolved = resolveCounterparty(current, patch.counterpartyName, patch.role)
    current = resolved.workspace
    counterpartyId = resolved.counterpartyId
  }

  const accountId = patch.accountId ?? existing.accountId
  const moved = accountId !== existing.accountId

  const updated: Transaction = {
    ...existing,
    accountId,
    sequence: moved ? nextSequence(current.transactions, accountId) : existing.sequence,
    date: patch.date ?? existing.date,
    direction: patch.direction ?? existing.direction,
    amount: patch.amount ?? existing.amount,
    // A statement balance describes a row as the bank wrote it. Once the row is
    // edited it no longer does, so the account is re-anchored on earlier rows.
    balance: isEdited(existing, patch) ? null : existing.balance,
    channel: patch.channel ?? existing.channel,
    counterpartyId,
    description: patch.description ?? existing.description,
    reference: patch.reference ?? existing.reference,
    note: patch.note ?? existing.note,
  }

  return recomputeBalances({
    ...current,
    transactions: current.transactions
      .map((entry) => (entry.id === transactionId ? updated : entry))
      .sort(compareTransactions),
  })
}

function isEdited(existing: Transaction, patch: Partial<TransactionInput>): boolean {
  return (
    (patch.amount !== undefined && patch.amount.minor !== existing.amount.minor) ||
    (patch.direction !== undefined && patch.direction !== existing.direction) ||
    (patch.date !== undefined && patch.date !== existing.date) ||
    (patch.accountId !== undefined && patch.accountId !== existing.accountId)
  )
}

export function removeTransaction(workspace: Workspace, transactionId: string): Workspace {
  const existing = workspace.transactions.find((entry) => entry.id === transactionId)
  if (!existing) throw new UnknownTransactionError(transactionId)

  // Half a transfer is never right, so both legs go together.
  const doomed = new Set([transactionId])
  if (existing.transferId !== null) {
    for (const entry of workspace.transactions) {
      if (entry.transferId === existing.transferId) doomed.add(entry.id)
    }
  }

  return recomputeBalances({
    ...workspace,
    transactions: workspace.transactions.filter((entry) => !doomed.has(entry.id)),
  })
}

/**
 * Records a move between two of your own accounts as two rows sharing a transfer id.
 * Both sides are labelled as your own accounts, so the money never reads as income
 * on one side or spending on the other.
 */
export function recordTransfer(workspace: Workspace, input: TransferInput): Workspace {
  requireAccountId(workspace, input.fromAccountId)
  requireAccountId(workspace, input.toAccountId)
  requireAmount(input.amount)
  requireDate(input.date)
  if (input.fromAccountId === input.toAccountId) throw new SameAccountTransferError()

  const from = workspace.accounts.find((entry) => entry.id === input.fromAccountId)
  const to = workspace.accounts.find((entry) => entry.id === input.toAccountId)
  if (!from || !to) throw new UnknownAccountError(input.fromAccountId)

  const transferId = stableId('transfer', from.id, to.id, input.date, input.amount.minor)

  const outgoing = resolveCounterparty(workspace, to.label, 'account')
  const incoming = resolveCounterparty(outgoing.workspace, from.label, 'account')
  let current = incoming.workspace
  const taken = new Set(current.transactions.map((entry) => entry.id))

  const legs: Transaction[] = [
    leg(current, taken, {
      accountId: from.id,
      direction: 'out',
      counterpartyId: outgoing.counterpartyId,
      description: `Transfer to ${to.label}`,
      input,
      transferId,
    }),
    leg(current, taken, {
      accountId: to.id,
      direction: 'in',
      counterpartyId: incoming.counterpartyId,
      description: `Transfer from ${from.label}`,
      input,
      transferId,
    }),
  ]

  current = {
    ...current,
    transactions: [...current.transactions, ...legs].sort(compareTransactions),
  }
  return recomputeBalances(current)
}

function leg(
  workspace: Workspace,
  taken: Set<string>,
  options: {
    accountId: string
    direction: Direction
    counterpartyId: string
    description: string
    input: TransferInput
    transferId: string
  },
): Transaction {
  const id = freeTransactionId(
    taken,
    options.transferId,
    options.accountId,
    options.direction,
    options.input.amount.minor,
  )
  taken.add(id)
  return {
    id,
    accountId: options.accountId,
    sequence: nextSequence(workspace.transactions, options.accountId),
    date: options.input.date,
    direction: options.direction,
    amount: options.input.amount,
    balance: null,
    channel: 'transfer',
    counterpartyId: options.counterpartyId,
    description: options.description,
    reference: '',
    source: 'manual',
    note: options.input.note,
    transferId: options.transferId,
  }
}

export function setCounterpartyDueDate(
  workspace: Workspace,
  counterpartyId: string,
  dueDate: IsoDate | null,
): Workspace {
  if (dueDate !== null) requireDate(dueDate)
  return {
    ...workspace,
    counterparties: workspace.counterparties.map((entry) =>
      entry.id === counterpartyId ? { ...entry, dueDate } : entry,
    ),
  }
}

export function setCounterpartyNote(
  workspace: Workspace,
  counterpartyId: string,
  note: string,
): Workspace {
  return {
    ...workspace,
    counterparties: workspace.counterparties.map((entry) =>
      entry.id === counterpartyId ? { ...entry, note } : entry,
    ),
  }
}
