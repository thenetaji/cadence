import { add, subtract, zero, type Money } from '../money'
import type { Account, IsoDate, Transaction, Workspace } from './types'

function signed(entry: Transaction): number {
  return entry.direction === 'in' ? entry.amount.minor : -entry.amount.minor
}

/**
 * Rebuilds every account balance from its transactions.
 *
 * A statement row that carries its own balance is the truth for that moment, so the
 * most recent one anchors the account: the opening balance is worked backwards from
 * it and the closing balance forwards. Rows you typed in carry no balance, which is
 * why adding one by hand moves the closing figure and nothing else.
 */
export function recomputeBalances(workspace: Workspace): Workspace {
  const byAccount = new Map<string, Transaction[]>()
  for (const entry of workspace.transactions) {
    const bucket = byAccount.get(entry.accountId)
    if (bucket) bucket.push(entry)
    else byAccount.set(entry.accountId, [entry])
  }

  return {
    ...workspace,
    accounts: workspace.accounts.map((account) =>
      rebuild(account, byAccount.get(account.id) ?? []),
    ),
  }
}

function rebuild(account: Account, entries: readonly Transaction[]): Account {
  const currency = account.currency
  const movement = entries.reduce((total, entry) => total + signed(entry), 0)

  let anchorIndex = -1
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    if (entries[index]?.balance != null) {
      anchorIndex = index
      break
    }
  }

  if (anchorIndex === -1) {
    return {
      ...account,
      closingBalance: add(account.openingBalance, { minor: movement, currency }),
    }
  }

  const upToAnchor = entries
    .slice(0, anchorIndex + 1)
    .reduce((total, entry) => total + signed(entry), 0)
  const anchor = entries[anchorIndex]?.balance ?? zero(currency)
  const openingBalance = subtract(anchor, { minor: upToAnchor, currency })

  return {
    ...account,
    openingBalance,
    closingBalance: add(openingBalance, { minor: movement, currency }),
  }
}

/** The balance of one account at the end of a given day, ignoring anything later. */
export function balanceOn(workspace: Workspace, accountId: string, date: IsoDate): Money | null {
  const account = workspace.accounts.find((entry) => entry.id === accountId)
  if (!account) return null

  const movement = workspace.transactions
    .filter((entry) => entry.accountId === accountId && entry.date <= date)
    .reduce((total, entry) => total + signed(entry), 0)

  return add(account.openingBalance, { minor: movement, currency: account.currency })
}
