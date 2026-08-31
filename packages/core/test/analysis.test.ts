import { describe, expect, it } from 'vitest'
import {
  applySuggestedRoles,
  availableBalance,
  decisions,
  emptyWorkspace,
  incomeRhythm,
  lentOutstanding,
  mergeStatement,
  monthlyTotals,
  overview,
  runway,
  setCounterpartyRole,
  type DraftTransaction,
  type Workspace,
} from '../src'
import { fromMajor, toMajor } from '../src/money'

function entry(
  date: string,
  name: string,
  major: number,
  balance: number | null = null,
): DraftTransaction {
  return {
    date,
    direction: major < 0 ? 'out' : 'in',
    amount: fromMajor(Math.abs(major), 'EUR'),
    balance: balance === null ? null : fromMajor(balance, 'EUR'),
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

function withRoles(workspace: Workspace, roles: Record<string, string>): Workspace {
  return Object.entries(roles).reduce((current, [name, role]) => {
    const party = current.counterparties.find((entry) => entry.displayName === name)
    if (!party) throw new Error(`No counterparty named ${name}`)
    return setCounterpartyRole(current, party.id, role as never)
  }, workspace)
}

describe('mergeStatement', () => {
  it('creates one counterparty per distinct name', () => {
    const workspace = build([
      entry('2026-01-05', 'Studio Client', 2000),
      entry('2026-01-06', 'Studio Client', 1000),
      entry('2026-01-07', 'Cafe', -4),
    ])

    expect(workspace.counterparties).toHaveLength(2)
    expect(workspace.transactions).toHaveLength(3)
  })

  it('skips rows already imported but keeps genuine same-day repeats', () => {
    const first = build([entry('2026-01-05', 'Cafe', -4), entry('2026-01-05', 'Cafe', -4)])
    const second = mergeStatement(first, {
      institution: 'Sample Bank',
      reference: 'DE01',
      currency: 'EUR',
      transactions: [
        entry('2026-01-05', 'Cafe', -4),
        entry('2026-01-05', 'Cafe', -4),
        entry('2026-01-06', 'Cafe', -4),
      ],
    })

    expect(first.transactions).toHaveLength(2)
    expect(second.summary.duplicates).toBe(2)
    expect(second.summary.added).toBe(1)
    expect(second.workspace.transactions).toHaveLength(3)
  })

  it('derives the opening balance from the closing balance and the movement', () => {
    const workspace = build([
      entry('2026-01-05', 'Client', 1000, 1100),
      entry('2026-01-06', 'Rent', -600, 500),
    ])

    expect(toMajor(workspace.accounts[0]?.openingBalance ?? fromMajor(0, 'EUR'))).toBe(100)
    expect(toMajor(availableBalance(workspace, 'EUR'))).toBe(500)
  })
})

describe('roles change what the numbers mean', () => {
  const base = build([
    entry('2026-01-05', 'Studio Client', 3000, 3000),
    entry('2026-01-10', 'Own Savings', -1000, 2000),
    entry('2026-01-12', 'Groceries', -200, 1800),
    entry('2026-01-20', 'Friend', -500, 1300),
    entry('2026-02-05', 'Studio Client', 3000, 4300),
    entry('2026-02-12', 'Groceries', -300, 4000),
    entry('2026-02-15', 'Mother', -400, 3600),
  ])

  const workspace = withRoles(base, {
    'Studio Client': 'client',
    'Own Savings': 'account',
    Groceries: 'spending',
    Friend: 'lent',
    Mother: 'support',
  })

  it('leaves transfers to your own accounts out of the monthly totals', () => {
    const january = monthlyTotals(workspace, 'EUR').find((month) => month.month === '2026-01')
    expect(toMajor(january?.outflow ?? fromMajor(0, 'EUR'))).toBe(700)
  })

  it('counts spending and support in the burn rate, not lending', () => {
    const result = runway(workspace, 'EUR')
    expect(toMajor(result.monthlyOutflow)).toBe(450)
    expect(toMajor(result.available)).toBe(3600)
    expect(result.months).toBeCloseTo(8, 5)
  })

  it('shows money lent as outstanding, never as spending', () => {
    const outstanding = lentOutstanding(workspace, 'EUR')
    expect(outstanding).toHaveLength(1)
    expect(toMajor(outstanding[0]?.net ?? fromMajor(0, 'EUR'))).toBe(-500)
  })

  it('adds lending back for total position but keeps runway on cash alone', () => {
    const result = overview(workspace, 'EUR')
    expect(toMajor(result.available)).toBe(3600)
    expect(toMajor(result.lentOutstanding)).toBe(500)
    expect(toMajor(result.totalPosition)).toBe(4100)
  })

  it('treats a repayment as reducing what is outstanding', () => {
    const repaid = withRoles(
      build([
        entry('2026-01-20', 'Friend', -500, 1300),
        entry('2026-03-01', 'Friend', 200, 1500),
      ]),
      { Friend: 'lent' },
    )
    expect(toMajor(lentOutstanding(repaid, 'EUR')[0]?.net ?? fromMajor(0, 'EUR'))).toBe(-300)
  })

  it('reports income rhythm from client payments only', () => {
    const rhythm = incomeRhythm(workspace, 'EUR')
    expect(toMajor(rhythm.received)).toBe(6000)
    expect(rhythm.clients).toHaveLength(1)
    expect(rhythm.topClientShare).toBe(1)
    expect(rhythm.longestGapDays).toBe(31)
  })
})

describe('decisions', () => {
  it('surfaces outflows worth at least a quarter of a normal month', () => {
    const workspace = withRoles(
      build([
        entry('2026-01-02', 'Groceries', -100),
        entry('2026-01-03', 'Groceries', -100),
        entry('2026-01-04', 'Laptop', -900),
        entry('2026-02-02', 'Groceries', -100),
        entry('2026-02-03', 'Groceries', -100),
      ]),
      { Groceries: 'spending', Laptop: 'spending' },
    )

    const found = decisions(workspace, 'EUR')
    expect(found.map((entry) => entry.description)).toEqual(['Laptop'])
  })

  it('returns nothing when there is no spending to compare against', () => {
    expect(decisions(emptyWorkspace('EUR', 'de-DE'), 'EUR')).toEqual([])
  })
})

describe('suggestRole', () => {
  it('guesses a client only when money arrives more than once', () => {
    const workspace = build([
      entry('2026-01-05', 'Repeat Client', 1000),
      entry('2026-02-05', 'Repeat Client', 1000),
      entry('2026-01-06', 'One Off Refund', 200),
    ])
    const guessed = applySuggestedRoles(workspace, 'EUR')

    expect(role(guessed, 'Repeat Client')).toBe('client')
    expect(role(guessed, 'One Off Refund')).toBe('unassigned')
  })

  it('guesses spending for repeated outgoings and recognises your own accounts', () => {
    const workspace = build([
      entry('2026-01-05', 'Corner Shop', -20),
      entry('2026-01-09', 'Corner Shop', -25),
      entry('2026-01-10', 'Transfer to Own Savings', -500),
      entry('2026-02-10', 'Transfer to Own Savings', -500),
    ])
    const guessed = applySuggestedRoles(workspace, 'EUR')

    expect(role(guessed, 'Corner Shop')).toBe('spending')
    expect(role(guessed, 'Transfer to Own Savings')).toBe('account')
  })

  it('leaves anyone you both pay and receive from for the person to judge', () => {
    const workspace = build([
      entry('2026-01-05', 'Sam', -500),
      entry('2026-03-05', 'Sam', 200),
    ])
    expect(role(applySuggestedRoles(workspace, 'EUR'), 'Sam')).toBe('unassigned')
  })

  it('never overwrites a label the person has already set', () => {
    const workspace = withRoles(
      build([entry('2026-01-05', 'Corner Shop', -20), entry('2026-01-09', 'Corner Shop', -25)]),
      { 'Corner Shop': 'support' },
    )
    expect(role(applySuggestedRoles(workspace, 'EUR'), 'Corner Shop')).toBe('support')
  })
})

function role(workspace: Workspace, name: string): string {
  return workspace.counterparties.find((entry) => entry.displayName === name)?.role ?? 'missing'
}

describe('same-day ordering', () => {
  it('keeps the order the statement listed, so the closing balance is the true last row', () => {
    const workspace = build([
      entry('2026-01-05', 'Client', 1000, 1000),
      entry('2026-01-31', 'Shop A', -100, 900),
      entry('2026-01-31', 'Shop B', -200, 700),
      entry('2026-01-31', 'Shop C', -300, 400),
    ])

    expect(workspace.transactions.map((item) => item.description)).toEqual([
      'Client',
      'Shop A',
      'Shop B',
      'Shop C',
    ])
    expect(toMajor(availableBalance(workspace, 'EUR'))).toBe(400)
  })

  it('continues numbering across a second import into the same account', () => {
    const first = build([entry('2026-01-31', 'Shop A', -100, 900)])
    const second = mergeStatement(first, {
      institution: 'Sample Bank',
      reference: 'DE01',
      currency: 'EUR',
      transactions: [entry('2026-01-31', 'Shop B', -200, 700)],
    }).workspace

    expect(second.transactions.map((item) => item.description)).toEqual(['Shop A', 'Shop B'])
    expect(toMajor(availableBalance(second, 'EUR'))).toBe(700)
  })
})
