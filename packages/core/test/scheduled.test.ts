import { describe, expect, it } from 'vitest'
import {
  UnknownScheduledItemError,
  addManualAccount,
  addMonths,
  addScheduled,
  advanceDate,
  availableBalance,
  dueScheduled,
  emptyWorkspace,
  forecast,
  lendingDue,
  monthProgress,
  occurrencesBetween,
  recordScheduled,
  removeScheduled,
  setCounterpartyDueDate,
  skipScheduled,
  spendingBreakdown,
  addTransaction,
  setCounterpartyRole,
  type ScheduledInput,
  type Workspace,
} from '../src'
import { fromMajor, toMajor } from '../src/money'

function withCash(major = 3000): { workspace: Workspace; accountId: string } {
  const workspace = addManualAccount(emptyWorkspace('EUR', 'de-DE'), 'Cash', fromMajor(major, 'EUR'))
  const accountId = workspace.accounts[0]?.id
  if (!accountId) throw new Error('expected an account')
  return { workspace, accountId }
}

function bill(accountId: string, overrides: Partial<ScheduledInput> = {}): ScheduledInput {
  return {
    label: 'Rent',
    accountId,
    counterpartyName: 'Landlord',
    direction: 'out',
    amount: fromMajor(900, 'EUR'),
    channel: 'transfer',
    cadence: 'monthly',
    nextDate: '2026-03-01',
    endDate: null,
    note: '',
    ...overrides,
  }
}

describe('advanceDate', () => {
  it('steps each cadence forward', () => {
    expect(advanceDate('2026-03-01', 'weekly')).toBe('2026-03-08')
    expect(advanceDate('2026-03-01', 'fortnightly')).toBe('2026-03-15')
    expect(advanceDate('2026-03-01', 'monthly')).toBe('2026-04-01')
    expect(advanceDate('2026-03-01', 'quarterly')).toBe('2026-06-01')
    expect(advanceDate('2026-03-01', 'yearly')).toBe('2027-03-01')
  })

  it('clamps a late day of the month to the end of a short one', () => {
    expect(advanceDate('2026-01-31', 'monthly')).toBe('2026-02-28')
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29')
  })
})

describe('scheduled items', () => {
  it('lists what is due on or before a date', () => {
    const { workspace, accountId } = withCash()
    const planned = addScheduled(workspace, bill(accountId))

    expect(dueScheduled(planned, '2026-02-28')).toHaveLength(0)
    expect(dueScheduled(planned, '2026-03-02')).toHaveLength(1)
  })

  it('records an occurrence and moves on to the next date', () => {
    const { workspace, accountId } = withCash(3000)
    const planned = addScheduled(workspace, bill(accountId))
    const itemId = planned.scheduled[0]?.id
    if (!itemId) throw new Error('expected a scheduled item')

    const updated = recordScheduled(planned, itemId)

    expect(updated.transactions).toHaveLength(1)
    expect(updated.transactions[0]?.description).toBe('Rent')
    expect(toMajor(availableBalance(updated, 'EUR'))).toBe(2100)
    expect(updated.scheduled[0]?.nextDate).toBe('2026-04-01')
  })

  it('accepts an amount that differs from the expected one', () => {
    const { workspace, accountId } = withCash(3000)
    const planned = addScheduled(workspace, bill(accountId))
    const itemId = planned.scheduled[0]?.id ?? ''

    const updated = recordScheduled(planned, itemId, { amount: fromMajor(950, 'EUR') })

    expect(toMajor(availableBalance(updated, 'EUR'))).toBe(2050)
    expect(toMajor(updated.scheduled[0]?.amount ?? fromMajor(0, 'EUR'))).toBe(900)
  })

  it('skips without writing anything down', () => {
    const { workspace, accountId } = withCash()
    const planned = addScheduled(workspace, bill(accountId))
    const itemId = planned.scheduled[0]?.id ?? ''

    const updated = skipScheduled(planned, itemId)

    expect(updated.transactions).toHaveLength(0)
    expect(updated.scheduled[0]?.nextDate).toBe('2026-04-01')
  })

  it('pauses itself once it runs past its end date', () => {
    const { workspace, accountId } = withCash()
    const planned = addScheduled(workspace, bill(accountId, { endDate: '2026-03-15' }))
    const itemId = planned.scheduled[0]?.id ?? ''

    const updated = skipScheduled(planned, itemId)

    expect(updated.scheduled[0]?.paused).toBe(true)
  })

  it('lists every repeat inside a window', () => {
    const { workspace, accountId } = withCash()
    const planned = addScheduled(workspace, bill(accountId, { cadence: 'weekly' }))

    const found = occurrencesBetween(planned, '2026-03-01', '2026-03-31')

    expect(found.map((entry) => entry.date)).toEqual([
      '2026-03-01',
      '2026-03-08',
      '2026-03-15',
      '2026-03-22',
      '2026-03-29',
    ])
  })

  it('catches up a run that began before the window', () => {
    const { workspace, accountId } = withCash()
    const planned = addScheduled(workspace, bill(accountId, { nextDate: '2025-01-10' }))

    const found = occurrencesBetween(planned, '2026-03-01', '2026-04-30')

    expect(found.map((entry) => entry.date)).toEqual(['2026-03-10', '2026-04-10'])
  })

  it('removes an item and throws for one that is gone', () => {
    const { workspace, accountId } = withCash()
    const planned = addScheduled(workspace, bill(accountId))
    const itemId = planned.scheduled[0]?.id ?? ''

    expect(removeScheduled(planned, itemId).scheduled).toHaveLength(0)
    expect(() => recordScheduled(workspace, 'nope')).toThrow(UnknownScheduledItemError)
  })
})

describe('forecast', () => {
  it('subtracts scheduled bills on the day they land', () => {
    const { workspace, accountId } = withCash(3000)
    const planned = addScheduled(workspace, bill(accountId, { nextDate: '2026-03-10' }))

    const result = forecast(planned, 'EUR', 30, '2026-03-01')

    expect(toMajor(result.points[0]?.balance ?? fromMajor(0, 'EUR'))).toBe(3000)
    expect(toMajor(result.committedOut)).toBe(900)
    expect(result.points[9]?.committed).toBe(true)
    expect(toMajor(result.endBalance)).toBe(2100)
  })

  it('reports the lowest point and when the money would run out', () => {
    const { workspace, accountId } = withCash(1000)
    const planned = addScheduled(
      workspace,
      bill(accountId, { nextDate: '2026-03-10', amount: fromMajor(1200, 'EUR') }),
    )

    const result = forecast(planned, 'EUR', 30, '2026-03-01')

    expect(result.daysUntilEmpty).toBe(9)
    expect(toMajor(result.lowest?.balance ?? fromMajor(0, 'EUR'))).toBe(-200)
  })

  it('counts expected income too', () => {
    const { workspace, accountId } = withCash(500)
    const planned = addScheduled(
      workspace,
      bill(accountId, {
        label: 'Retainer',
        direction: 'in',
        amount: fromMajor(2000, 'EUR'),
        nextDate: '2026-03-05',
      }),
    )

    const result = forecast(planned, 'EUR', 30, '2026-03-01')

    expect(toMajor(result.committedIn)).toBe(2000)
    expect(toMajor(result.endBalance)).toBe(2500)
    expect(result.daysUntilEmpty).toBeNull()
  })
})

describe('monthProgress', () => {
  it('reports nothing to measure against without a target', () => {
    const { workspace, accountId } = withCash()
    const spent = addTransaction(workspace, {
      accountId,
      date: '2026-03-04',
      direction: 'out',
      amount: fromMajor(120, 'EUR'),
      counterpartyName: 'Corner Market',
      channel: 'card',
      description: 'Groceries',
      note: '',
      reference: '',
    }).workspace

    const progress = monthProgress(spent, 'EUR', '2026-03-15')

    expect(toMajor(progress.spent)).toBe(120)
    expect(progress.target).toBeNull()
    expect(progress.pace).toBeNull()
  })

  it('measures what is left and the pace against a target', () => {
    const { workspace, accountId } = withCash()
    const planned: Workspace = {
      ...workspace,
      plan: { ...workspace.plan, monthlySpendingTarget: fromMajor(1000, 'EUR') },
    }
    const spent = addTransaction(planned, {
      accountId,
      date: '2026-03-04',
      direction: 'out',
      amount: fromMajor(750, 'EUR'),
      counterpartyName: 'Corner Market',
      channel: 'card',
      description: 'Groceries',
      note: '',
      reference: '',
    }).workspace

    // Half the month gone, three quarters of the target spent.
    const progress = monthProgress(spent, 'EUR', '2026-03-16')

    expect(toMajor(progress.remaining ?? fromMajor(0, 'EUR'))).toBe(250)
    expect(progress.daysLeft).toBe(16)
    expect(progress.pace).toBeCloseTo(1.5, 1)
  })
})

describe('spendingBreakdown', () => {
  it('ranks where the money went and shares add up to one', () => {
    const { workspace, accountId } = withCash()
    let current = workspace
    for (const [name, major] of [
      ['Corner Market', 300],
      ['Cafe Rosso', 100],
    ] as const) {
      current = addTransaction(current, {
        accountId,
        date: '2026-03-04',
        direction: 'out',
        amount: fromMajor(major, 'EUR'),
        counterpartyName: name,
        channel: 'card',
        description: name,
        note: '',
        reference: '',
      }).workspace
    }

    const slices = spendingBreakdown(current, 'EUR', '2026-03-01')

    expect(slices.map((entry) => entry.name)).toEqual(['Corner Market', 'Cafe Rosso'])
    expect(slices[0]?.share).toBeCloseTo(0.75, 5)
    expect(slices.reduce((total, entry) => total + entry.share, 0)).toBeCloseTo(1, 5)
  })
})

describe('lendingDue', () => {
  it('puts the soonest date first and marks a date already passed', () => {
    const { workspace, accountId } = withCash()
    let current = workspace
    for (const [name, day] of [
      ['Sam Rivera', '2026-01-10'],
      ['Alex Fenn', '2026-02-10'],
    ] as const) {
      current = addTransaction(current, {
        accountId,
        date: day,
        direction: 'out',
        amount: fromMajor(500, 'EUR'),
        counterpartyName: name,
        channel: 'transfer',
        description: name,
        note: '',
        reference: '',
      }).workspace
      const party = current.counterparties.find((entry) => entry.displayName === name)
      if (!party) throw new Error('expected a counterparty')
      current = setCounterpartyRole(current, party.id, 'lent')
    }

    const sam = current.counterparties.find((entry) => entry.displayName === 'Sam Rivera')
    const alex = current.counterparties.find((entry) => entry.displayName === 'Alex Fenn')
    current = setCounterpartyDueDate(current, sam?.id ?? '', '2026-04-01')
    current = setCounterpartyDueDate(current, alex?.id ?? '', '2026-03-01')

    const due = lendingDue(current, 'EUR', '2026-03-15')

    expect(due.map((entry) => entry.entry.counterparty.displayName)).toEqual([
      'Alex Fenn',
      'Sam Rivera',
    ])
    expect(due[0]?.daysUntilDue).toBe(-14)
    expect(toMajor(due[0]?.outstanding ?? fromMajor(0, 'EUR'))).toBe(500)
  })
})
