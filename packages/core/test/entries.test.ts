import { describe, expect, it } from 'vitest'
import {
  InvalidAmountError,
  InvalidDateError,
  SameAccountTransferError,
  UnknownAccountError,
  UnknownTransactionError,
  addManualAccount,
  addTransaction,
  availableBalance,
  emptyWorkspace,
  mergeStatement,
  monthlyTotals,
  recordTransfer,
  removeTransaction,
  setManualBalance,
  updateTransaction,
  type DraftTransaction,
  type TransactionInput,
  type Workspace,
} from '../src'
import { fromMajor, toMajor } from '../src/money'

function statementRow(date: string, name: string, major: number, balance: number): DraftTransaction {
  return {
    date,
    direction: major < 0 ? 'out' : 'in',
    amount: fromMajor(Math.abs(major), 'EUR'),
    balance: fromMajor(balance, 'EUR'),
    channel: 'other',
    counterpartyName: name,
    description: name,
    reference: '',
  }
}

function imported(rows: DraftTransaction[]): Workspace {
  return mergeStatement(emptyWorkspace('EUR', 'de-DE'), {
    institution: 'Sample Bank',
    reference: 'DE01',
    currency: 'EUR',
    transactions: rows,
  }).workspace
}

function cash(major = 500): { workspace: Workspace; accountId: string } {
  const workspace = addManualAccount(emptyWorkspace('EUR', 'de-DE'), 'Cash', fromMajor(major, 'EUR'))
  const accountId = workspace.accounts[0]?.id
  if (!accountId) throw new Error('expected an account')
  return { workspace, accountId }
}

function input(accountId: string, overrides: Partial<TransactionInput> = {}): TransactionInput {
  return {
    accountId,
    date: '2026-03-04',
    direction: 'out',
    amount: fromMajor(20, 'EUR'),
    counterpartyName: 'Corner Market',
    channel: 'card',
    description: 'Groceries',
    note: '',
    reference: '',
    ...overrides,
  }
}

describe('addTransaction', () => {
  it('lowers the account balance by an outgoing amount', () => {
    const { workspace, accountId } = cash(500)

    const result = addTransaction(workspace, input(accountId))

    expect(toMajor(availableBalance(result.workspace, 'EUR'))).toBe(480)
    expect(result.transaction.source).toBe('manual')
    expect(result.transaction.balance).toBeNull()
  })

  it('raises it by an incoming one', () => {
    const { workspace, accountId } = cash(500)

    const result = addTransaction(
      workspace,
      input(accountId, { direction: 'in', amount: fromMajor(120, 'EUR') }),
    )

    expect(toMajor(availableBalance(result.workspace, 'EUR'))).toBe(620)
  })

  it('creates the counterparty once and reuses it after', () => {
    const { workspace, accountId } = cash()

    const first = addTransaction(workspace, input(accountId))
    const second = addTransaction(first.workspace, input(accountId, { date: '2026-03-09' }))

    expect(second.workspace.counterparties).toHaveLength(1)
    expect(second.workspace.counterparties[0]?.displayName).toBe('Corner Market')
    expect(second.workspace.counterparties[0]?.role).toBe('unassigned')
  })

  it('keeps two identical entries apart', () => {
    const { workspace, accountId } = cash()

    const first = addTransaction(workspace, input(accountId))
    const second = addTransaction(first.workspace, input(accountId))

    expect(second.workspace.transactions).toHaveLength(2)
    expect(second.transaction.id).not.toBe(first.transaction.id)
  })

  it('shifts the closing balance of an imported account without disturbing its opening one', () => {
    const workspace = imported([
      statementRow('2026-01-05', 'Client', 1000, 3000),
      statementRow('2026-01-09', 'Cafe', -40, 2960),
    ])
    const account = workspace.accounts[0]
    if (!account) throw new Error('expected an account')

    const result = addTransaction(
      workspace,
      input(account.id, { date: '2026-01-11', amount: fromMajor(60, 'EUR') }),
    )
    const updated = result.workspace.accounts[0]

    expect(toMajor(updated?.openingBalance ?? fromMajor(0, 'EUR'))).toBe(2000)
    expect(toMajor(updated?.closingBalance ?? fromMajor(0, 'EUR'))).toBe(2900)
  })

  it('appears in the monthly totals', () => {
    const { workspace, accountId } = cash()

    const result = addTransaction(workspace, input(accountId))
    const march = monthlyTotals(result.workspace, 'EUR').find((month) => month.month === '2026-03')

    expect(toMajor(march?.outflow ?? fromMajor(0, 'EUR'))).toBe(20)
  })

  it('refuses an unknown account, a zero amount and an unreadable date', () => {
    const { workspace, accountId } = cash()

    expect(() => addTransaction(workspace, input('nope'))).toThrow(UnknownAccountError)
    expect(() => addTransaction(workspace, input(accountId, { amount: fromMajor(0, 'EUR') }))).toThrow(
      InvalidAmountError,
    )
    expect(() => addTransaction(workspace, input(accountId, { date: '4 March' }))).toThrow(
      InvalidDateError,
    )
  })
})

describe('updateTransaction', () => {
  it('changes the amount and the balance follows', () => {
    const { workspace, accountId } = cash(500)
    const added = addTransaction(workspace, input(accountId))

    const updated = updateTransaction(added.workspace, added.transaction.id, {
      amount: fromMajor(35, 'EUR'),
    })

    expect(toMajor(availableBalance(updated, 'EUR'))).toBe(465)
  })

  it('moves a row to another account and both balances follow', () => {
    const { workspace, accountId } = cash(500)
    const withSecond = addManualAccount(workspace, 'Savings', fromMajor(1000, 'EUR'))
    const savingsId = withSecond.accounts.find((entry) => entry.label === 'Savings')?.id
    if (!savingsId) throw new Error('expected the savings account')

    const added = addTransaction(withSecond, input(accountId))
    const updated = updateTransaction(added.workspace, added.transaction.id, {
      accountId: savingsId,
    })

    const byLabel = new Map(updated.accounts.map((entry) => [entry.label, entry]))
    expect(toMajor(byLabel.get('Cash')?.closingBalance ?? fromMajor(0, 'EUR'))).toBe(500)
    expect(toMajor(byLabel.get('Savings')?.closingBalance ?? fromMajor(0, 'EUR'))).toBe(980)
  })

  it('drops the statement balance once an imported row is edited', () => {
    const workspace = imported([statementRow('2026-01-05', 'Client', 1000, 3000)])
    const target = workspace.transactions[0]
    if (!target) throw new Error('expected a transaction')

    const updated = updateTransaction(workspace, target.id, { amount: fromMajor(1200, 'EUR') })

    expect(updated.transactions[0]?.balance).toBeNull()
    expect(toMajor(updated.accounts[0]?.closingBalance ?? fromMajor(0, 'EUR'))).toBe(3200)
  })

  it('keeps the statement balance when only the note changes', () => {
    const workspace = imported([statementRow('2026-01-05', 'Client', 1000, 3000)])
    const target = workspace.transactions[0]
    if (!target) throw new Error('expected a transaction')

    const updated = updateTransaction(workspace, target.id, { note: 'invoice 21' })

    expect(updated.transactions[0]?.balance).not.toBeNull()
    expect(updated.transactions[0]?.note).toBe('invoice 21')
  })

  it('throws for a transaction that is not there', () => {
    const { workspace } = cash()
    expect(() => updateTransaction(workspace, 'nope', { note: 'x' })).toThrow(
      UnknownTransactionError,
    )
  })
})

describe('removeTransaction', () => {
  it('gives the money back to the balance', () => {
    const { workspace, accountId } = cash(500)
    const added = addTransaction(workspace, input(accountId))

    const updated = removeTransaction(added.workspace, added.transaction.id)

    expect(updated.transactions).toHaveLength(0)
    expect(toMajor(availableBalance(updated, 'EUR'))).toBe(500)
  })
})

describe('recordTransfer', () => {
  function twoAccounts(): { workspace: Workspace; from: string; to: string } {
    const first = addManualAccount(emptyWorkspace('EUR', 'de-DE'), 'Cash', fromMajor(500, 'EUR'))
    const workspace = addManualAccount(first, 'Savings', fromMajor(1000, 'EUR'))
    const from = workspace.accounts.find((entry) => entry.label === 'Cash')?.id ?? ''
    const to = workspace.accounts.find((entry) => entry.label === 'Savings')?.id ?? ''
    return { workspace, from, to }
  }

  it('moves money between accounts and leaves the total alone', () => {
    const { workspace, from, to } = twoAccounts()

    const updated = recordTransfer(workspace, {
      fromAccountId: from,
      toAccountId: to,
      date: '2026-03-04',
      amount: fromMajor(200, 'EUR'),
      note: '',
    })

    const byLabel = new Map(updated.accounts.map((entry) => [entry.label, entry]))
    expect(toMajor(byLabel.get('Cash')?.closingBalance ?? fromMajor(0, 'EUR'))).toBe(300)
    expect(toMajor(byLabel.get('Savings')?.closingBalance ?? fromMajor(0, 'EUR'))).toBe(1200)
    expect(toMajor(availableBalance(updated, 'EUR'))).toBe(1500)
  })

  it('is not counted as income or spending', () => {
    const { workspace, from, to } = twoAccounts()

    const updated = recordTransfer(workspace, {
      fromAccountId: from,
      toAccountId: to,
      date: '2026-03-04',
      amount: fromMajor(200, 'EUR'),
      note: '',
    })

    expect(monthlyTotals(updated, 'EUR')).toHaveLength(0)
    expect(updated.counterparties.every((entry) => entry.role === 'account')).toBe(true)
  })

  it('takes both legs away together', () => {
    const { workspace, from, to } = twoAccounts()
    const updated = recordTransfer(workspace, {
      fromAccountId: from,
      toAccountId: to,
      date: '2026-03-04',
      amount: fromMajor(200, 'EUR'),
      note: '',
    })
    const leg = updated.transactions[0]
    if (!leg) throw new Error('expected a transfer leg')

    const removed = removeTransaction(updated, leg.id)

    expect(removed.transactions).toHaveLength(0)
    expect(toMajor(availableBalance(removed, 'EUR'))).toBe(1500)
  })

  it('refuses a transfer to the same account', () => {
    const { workspace, from } = twoAccounts()

    expect(() =>
      recordTransfer(workspace, {
        fromAccountId: from,
        toAccountId: from,
        date: '2026-03-04',
        amount: fromMajor(200, 'EUR'),
        note: '',
      }),
    ).toThrow(SameAccountTransferError)
  })
})

describe('setManualBalance', () => {
  it('treats the figure as the balance now and keeps recorded movements', () => {
    const { workspace, accountId } = cash(500)
    const added = addTransaction(workspace, input(accountId))

    const updated = setManualBalance(added.workspace, accountId, fromMajor(300, 'EUR'))
    const account = updated.accounts[0]

    expect(toMajor(account?.closingBalance ?? fromMajor(0, 'EUR'))).toBe(300)
    expect(toMajor(account?.openingBalance ?? fromMajor(0, 'EUR'))).toBe(320)
    expect(updated.transactions).toHaveLength(1)
  })
})
