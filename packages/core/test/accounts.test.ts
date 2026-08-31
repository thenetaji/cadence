import { describe, expect, it } from 'vitest'
import {
  DuplicateAccountError,
  NotAManualAccountError,
  addManualAccount,
  availableBalance,
  emptyWorkspace,
  mergeStatement,
  removeAccount,
  renameAccount,
  setManualBalance,
  type DraftTransaction,
  type Workspace,
} from '../src'
import { fromMajor, toMajor } from '../src/money'

function entry(date: string, name: string, major: number, balance: number): DraftTransaction {
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

function build(transactions: DraftTransaction[]): Workspace {
  return mergeStatement(emptyWorkspace('EUR', 'de-DE'), {
    institution: 'Sample Bank',
    reference: 'DE01',
    currency: 'EUR',
    transactions,
  }).workspace
}

describe('renameAccount', () => {
  it('changes the label and leaves everything else untouched', () => {
    const workspace = build([entry('2026-01-05', 'Client', 1000, 1000)])
    const account = workspace.accounts[0]
    if (!account) throw new Error('expected an account')

    const renamed = renameAccount(workspace, account.id, 'Main Checking')
    const updated = renamed.accounts[0]
    if (!updated) throw new Error('expected an account')

    expect(updated.id).toBe(account.id)
    expect(updated.label).toBe('Main Checking')
    expect(updated.openingBalance).toEqual(account.openingBalance)
    expect(updated.closingBalance).toEqual(account.closingBalance)
    expect(renamed.transactions).toEqual(workspace.transactions)
  })
})

describe('addManualAccount', () => {
  it('raises available balance by exactly the opening amount', () => {
    const workspace = emptyWorkspace('EUR', 'de-DE')
    const before = availableBalance(workspace, 'EUR')

    const updated = addManualAccount(workspace, 'Cash', fromMajor(250, 'EUR'))

    expect(toMajor(availableBalance(updated, 'EUR'))).toBe(toMajor(before) + 250)
    expect(updated.accounts).toHaveLength(1)
    expect(updated.accounts[0]?.source).toBe('manual')
  })

  it('throws when the same label is added twice', () => {
    const workspace = addManualAccount(emptyWorkspace('EUR', 'de-DE'), 'Cash', fromMajor(100, 'EUR'))
    expect(() => addManualAccount(workspace, 'Cash', fromMajor(50, 'EUR'))).toThrow(
      DuplicateAccountError,
    )
  })
})

describe('setManualBalance', () => {
  it('throws for an imported account', () => {
    const workspace = build([entry('2026-01-05', 'Client', 1000, 1000)])
    const account = workspace.accounts[0]
    if (!account) throw new Error('expected an account')

    expect(() => setManualBalance(workspace, account.id, fromMajor(2000, 'EUR'))).toThrow(
      NotAManualAccountError,
    )
  })

  it('updates both opening and closing balance on a manual account', () => {
    const workspace = addManualAccount(emptyWorkspace('EUR', 'de-DE'), 'Cash', fromMajor(100, 'EUR'))
    const account = workspace.accounts[0]
    if (!account) throw new Error('expected an account')

    const updated = setManualBalance(workspace, account.id, fromMajor(400, 'EUR'))
    const result = updated.accounts[0]
    if (!result) throw new Error('expected an account')

    expect(toMajor(result.openingBalance)).toBe(400)
    expect(toMajor(result.closingBalance)).toBe(400)
  })
})

describe('removeAccount', () => {
  it('removes the account and its transactions, and only the counterparties left with none', () => {
    const first = build([entry('2026-01-05', 'Client', 1000, 1000)])
    const withSecond = mergeStatement(first, {
      institution: 'Other Bank',
      reference: 'DE02',
      currency: 'EUR',
      transactions: [entry('2026-01-06', 'Client', 500, 500)],
    }).workspace

    expect(withSecond.accounts).toHaveLength(2)
    expect(withSecond.counterparties).toHaveLength(1)

    const firstAccountId = withSecond.accounts[0]?.id
    if (!firstAccountId) throw new Error('expected an account')

    const updated = removeAccount(withSecond, firstAccountId)

    expect(updated.accounts).toHaveLength(1)
    expect(updated.transactions.every((entry) => entry.accountId !== firstAccountId)).toBe(true)
    expect(updated.counterparties).toHaveLength(1)
    expect(updated.counterparties[0]?.displayName).toBe('Client')
  })

  it('drops a counterparty that has no transactions left anywhere', () => {
    const workspace = build([
      entry('2026-01-05', 'Client', 1000, 1000),
      entry('2026-01-06', 'Only Here', 200, 1200),
    ])
    const accountId = workspace.accounts[0]?.id
    if (!accountId) throw new Error('expected an account')

    const updated = removeAccount(workspace, accountId)

    expect(updated.counterparties).toHaveLength(0)
    expect(updated.transactions).toHaveLength(0)
  })

  it('lowers available balance by exactly the removed account closing balance', () => {
    const workspace = build([entry('2026-01-05', 'Client', 1000, 1000)])
    const withCash = addManualAccount(workspace, 'Cash', fromMajor(300, 'EUR'))
    const before = availableBalance(withCash, 'EUR')
    const cashAccountId = withCash.accounts.find((entry) => entry.label === 'Cash')?.id
    if (!cashAccountId) throw new Error('expected the cash account')

    const updated = removeAccount(withCash, cashAccountId)

    expect(toMajor(availableBalance(updated, 'EUR'))).toBe(toMajor(before) - 300)
  })
})
