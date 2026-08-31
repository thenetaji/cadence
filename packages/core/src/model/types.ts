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
}

export interface Counterparty {
  id: string
  displayName: string
  role: CounterpartyRole
  aliases: string[]
  note: string
}

export interface Workspace {
  version: number
  displayCurrency: CurrencyCode
  locale: string
  accounts: Account[]
  counterparties: Counterparty[]
  transactions: Transaction[]
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

export function emptyWorkspace(currency: CurrencyCode, locale: string): Workspace {
  return {
    version: 1,
    displayCurrency: currency,
    locale,
    accounts: [],
    counterparties: [],
    transactions: [],
  }
}
