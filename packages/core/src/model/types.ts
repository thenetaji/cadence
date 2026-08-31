import type { CurrencyCode, Money } from '../money'

export type IsoDate = string

export type Direction = 'in' | 'out'

export type Channel =
  | 'transfer'
  | 'card'
  | 'atm'
  | 'cash'
  | 'fee'
  | 'interest'
  | 'other'

export const counterpartyRoles = [
  'unassigned',
  'account',
  'client',
  'spending',
  'lent',
  'support',
] as const

export type CounterpartyRole = (typeof counterpartyRoles)[number]

export type AccountSource = 'imported' | 'manual'

export type TransactionSource = 'imported' | 'manual'

export const cadences = ['weekly', 'fortnightly', 'monthly', 'quarterly', 'yearly'] as const

export type Cadence = (typeof cadences)[number]

export interface Account {
  id: string
  label: string
  institution: string
  reference: string
  currency: CurrencyCode
  source: AccountSource
  openingBalance: Money
  closingBalance: Money
}

export interface Transaction {
  id: string
  accountId: string
  sequence: number
  date: IsoDate
  direction: Direction
  amount: Money
  balance: Money | null
  channel: Channel
  counterpartyId: string
  description: string
  reference: string
  /** Where the row came from. Imported rows carry a statement balance; typed ones do not. */
  source: TransactionSource
  /** Anything you want to remember about this one movement. */
  note: string
  /** Both halves of a move between your own accounts share this. */
  transferId: string | null
}

export interface Counterparty {
  id: string
  displayName: string
  role: CounterpartyRole
  aliases: string[]
  note: string
  /** When money lent is expected back. Only meaningful while the role is `lent`. */
  dueDate: IsoDate | null
}

/** A bill, subscription or invoice you expect again on a rhythm. */
export interface ScheduledItem {
  id: string
  label: string
  accountId: string
  counterpartyId: string
  direction: Direction
  amount: Money
  channel: Channel
  cadence: Cadence
  /** The next date this is expected. Recording an occurrence moves it on. */
  nextDate: IsoDate
  endDate: IsoDate | null
  note: string
  paused: boolean
}

export interface Plan {
  /** What you mean to keep monthly spending under. */
  monthlySpendingTarget: Money | null
  /** How many months of runway you want to hold. */
  runwayTargetMonths: number | null
}

export interface Workspace {
  version: number
  displayCurrency: CurrencyCode
  locale: string
  accounts: Account[]
  counterparties: Counterparty[]
  transactions: Transaction[]
  scheduled: ScheduledItem[]
  plan: Plan
}

export interface DraftTransaction {
  date: IsoDate
  direction: Direction
  amount: Money
  balance: Money | null
  channel: Channel
  counterpartyName: string
  description: string
  reference: string
}

export interface DraftStatement {
  institution: string
  reference: string
  currency: CurrencyCode
  transactions: DraftTransaction[]
}

export const WORKSPACE_VERSION = 2

export function emptyPlan(): Plan {
  return { monthlySpendingTarget: null, runwayTargetMonths: null }
}

export function emptyWorkspace(currency: CurrencyCode, locale: string): Workspace {
  return {
    version: WORKSPACE_VERSION,
    displayCurrency: currency,
    locale,
    accounts: [],
    counterparties: [],
    transactions: [],
    scheduled: [],
    plan: emptyPlan(),
  }
}

/**
 * Fills in anything a workspace written by an older version of Cadence is missing.
 * Everything added since version 1 is optional at rest, so a restored backup and a
 * file already on the device both come back through here before anything reads them.
 */
export function normaliseWorkspace(workspace: Workspace): Workspace {
  return {
    ...workspace,
    version: WORKSPACE_VERSION,
    accounts: workspace.accounts ?? [],
    counterparties: (workspace.counterparties ?? []).map((entry) => ({
      ...entry,
      aliases: entry.aliases ?? [],
      note: entry.note ?? '',
      dueDate: entry.dueDate ?? null,
    })),
    transactions: (workspace.transactions ?? []).map((entry) => ({
      ...entry,
      source: entry.source ?? 'imported',
      note: entry.note ?? '',
      transferId: entry.transferId ?? null,
    })),
    scheduled: workspace.scheduled ?? [],
    plan: { ...emptyPlan(), ...(workspace.plan ?? {}) },
  }
}
