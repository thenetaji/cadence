import { add, subtract, zero, type CurrencyCode, type Money } from '../money'
import { stableId } from './id'
import type {
  Account,
  Counterparty,
  DraftStatement,
  DraftTransaction,
  Transaction,
  Workspace,
} from './types'

export interface MergeSummary {
  accountId: string
  added: number
  duplicates: number
  newCounterparties: string[]
}

export interface MergeResult {
  workspace: Workspace
  summary: MergeSummary
}

export function normaliseName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9@ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function transactionId(accountId: string, draft: DraftTransaction, ordinal: number): string {
  return stableId(
    accountId,
    draft.date,
    draft.direction,
    draft.amount.minor,
    normaliseName(draft.description),
    draft.reference,
    ordinal,
  )
}

export function counterpartyKey(name: string): string {
  return stableId('counterparty', normaliseName(name))
}

export function mergeStatement(workspace: Workspace, statement: DraftStatement): MergeResult {
  const accountId = stableId('account', statement.institution, statement.reference)
  const counterparties = new Map(workspace.counterparties.map((entry) => [entry.id, entry]))
  const existingIds = new Set(workspace.transactions.map((entry) => entry.id))
  const newCounterparties: string[] = []

  const seenThisImport = new Map<string, number>()
  const added: Transaction[] = []
  let duplicates = 0
  let sequence = nextSequence(workspace.transactions, accountId)

  for (const draft of statement.transactions) {
    const fingerprint = `${draft.date}|${draft.direction}|${draft.amount.minor}|${normaliseName(draft.description)}|${draft.reference}`
    const ordinal = seenThisImport.get(fingerprint) ?? 0
    seenThisImport.set(fingerprint, ordinal + 1)

    const id = transactionId(accountId, draft, ordinal)
    if (existingIds.has(id)) {
      duplicates += 1
      continue
    }
    existingIds.add(id)

    const name = draft.counterpartyName.trim() === '' ? 'Unnamed' : draft.counterpartyName.trim()
    const partyId = counterpartyKey(name)
    if (!counterparties.has(partyId)) {
      counterparties.set(partyId, {
        id: partyId,
        displayName: name,
        role: 'unassigned',
        aliases: [],
        note: '',
        dueDate: null,
      })
      newCounterparties.push(partyId)
    }

    added.push({
      id,
      accountId,
      sequence: sequence++,
      date: draft.date,
      direction: draft.direction,
      amount: draft.amount,
      balance: draft.balance,
      channel: draft.channel,
      counterpartyId: partyId,
      description: draft.description,
      reference: draft.reference,
      source: 'imported',
      note: '',
      transferId: null,
    })
  }

  const transactions = [...workspace.transactions, ...added].sort(compareTransactions)
  const accounts = upsertAccount(workspace.accounts, accountId, statement, transactions)

  return {
    workspace: {
      ...workspace,
      accounts,
      counterparties: [...counterparties.values()].sort((left, right) =>
        left.displayName.localeCompare(right.displayName),
      ),
      transactions,
    },
    summary: { accountId, added: added.length, duplicates, newCounterparties },
  }
}

export function nextSequence(transactions: readonly Transaction[], accountId: string): number {
  let highest = -1
  for (const entry of transactions) {
    if (entry.accountId === accountId && entry.sequence > highest) highest = entry.sequence
  }
  return highest + 1
}

// Statements list same-day rows in a meaningful order, and the running balance
// only reads correctly if that order survives. Sorting ties any other way puts
// the wrong row last and takes the closing balance from it.
export function compareTransactions(left: Transaction, right: Transaction): number {
  return (
    left.date.localeCompare(right.date) ||
    left.sequence - right.sequence ||
    left.accountId.localeCompare(right.accountId)
  )
}

function upsertAccount(
  accounts: readonly Account[],
  accountId: string,
  statement: DraftStatement,
  transactions: readonly Transaction[],
): Account[] {
  const own = transactions.filter((entry) => entry.accountId === accountId)
  const last = own.at(-1)
  const currency = statement.currency

  const movement = own.reduce<Money>(
    (total, entry) =>
      entry.direction === 'in' ? add(total, entry.amount) : subtract(total, entry.amount),
    zero(currency),
  )

  const existing = accounts.find((entry) => entry.id === accountId)
  const openingBalance =
    last?.balance != null ? subtract(last.balance, movement) : (existing?.openingBalance ?? zero(currency))

  const account: Account = {
    id: accountId,
    label: existing?.label ?? statement.institution,
    institution: statement.institution,
    reference: statement.reference,
    currency,
    source: 'imported',
    openingBalance,
    closingBalance: last?.balance ?? add(openingBalance, movement),
  }

  return existing
    ? accounts.map((entry) => (entry.id === accountId ? account : entry))
    : [...accounts, account]
}

export class UnknownCounterpartyError extends Error {
  constructor(id: string) {
    super(`No counterparty with id ${id}`)
    this.name = 'UnknownCounterpartyError'
  }
}

export function mergeCounterparties(
  workspace: Workspace,
  keepId: string,
  absorbId: string,
): Workspace {
  if (keepId === absorbId) return workspace

  const keep = workspace.counterparties.find((entry) => entry.id === keepId)
  const absorb = workspace.counterparties.find((entry) => entry.id === absorbId)
  if (!keep) throw new UnknownCounterpartyError(keepId)
  if (!absorb) throw new UnknownCounterpartyError(absorbId)

  const aliases = [...new Set([...keep.aliases, absorb.displayName, ...absorb.aliases])].filter(
    (alias) => alias !== keep.displayName,
  )

  return {
    ...workspace,
    counterparties: workspace.counterparties
      .filter((entry) => entry.id !== absorbId)
      .map((entry) => (entry.id === keepId ? { ...entry, aliases } : entry)),
    transactions: workspace.transactions.map((entry) =>
      entry.counterpartyId === absorbId ? { ...entry, counterpartyId: keepId } : entry,
    ),
  }
}

export function renameCounterparty(
  workspace: Workspace,
  counterpartyId: string,
  displayName: string,
): Workspace {
  return {
    ...workspace,
    counterparties: workspace.counterparties.map((entry) =>
      entry.id === counterpartyId ? { ...entry, displayName } : entry,
    ),
  }
}

export function setCounterpartyRole(
  workspace: Workspace,
  counterpartyId: string,
  role: Counterparty['role'],
): Workspace {
  return {
    ...workspace,
    counterparties: workspace.counterparties.map((entry) =>
      entry.id === counterpartyId ? { ...entry, role } : entry,
    ),
  }
}

export function changeDisplayCurrency(workspace: Workspace, currency: CurrencyCode): Workspace {
  if (workspace.displayCurrency === currency) return workspace

  return {
    ...workspace,
    displayCurrency: currency,
    accounts: workspace.accounts.map((account) => ({
      ...account,
      currency,
      openingBalance: { ...account.openingBalance, currency },
      closingBalance: { ...account.closingBalance, currency },
    })),
    transactions: workspace.transactions.map((entry) => ({
      ...entry,
      amount: { ...entry.amount, currency },
      balance: entry.balance === null ? null : { ...entry.balance, currency },
    })),
  }
}
