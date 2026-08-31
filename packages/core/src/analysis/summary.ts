import { daysBetween, monthKey } from '../import/dates'
import type { Counterparty, CounterpartyRole, IsoDate, Transaction, Workspace } from '../model'
import {
  add,
  divideByCount,
  isZero,
  ratio,
  subtract,
  sum,
  zero,
  type CurrencyCode,
  type Money,
} from '../money'

const DECISION_SHARE_OF_MONTH = 0.25
const RUNWAY_WINDOW_MONTHS = 6

export interface MonthTotals {
  month: string
  inflow: Money
  outflow: Money
  count: number
}

export interface PartyTotals {
  counterparty: Counterparty
  inflow: Money
  outflow: Money
  net: Money
  count: number
  firstDate: IsoDate | null
  lastDate: IsoDate | null
}

export interface Runway {
  available: Money
  monthlyOutflow: Money
  months: number | null
}

export interface IncomeRhythm {
  received: Money
  clients: PartyTotals[]
  months: MonthTotals[]
  longestGapDays: number | null
  topClientShare: number
  monthsWithoutIncome: number
}

export interface Overview {
  currency: CurrencyCode
  available: Money
  lentOutstanding: Money
  totalPosition: Money
  currentMonth: MonthTotals | null
  months: MonthTotals[]
  runway: Runway
  decisions: Transaction[]
}

function rolesOf(workspace: Workspace): Map<string, CounterpartyRole> {
  return new Map(workspace.counterparties.map((entry) => [entry.id, entry.role]))
}

export function inCurrency(workspace: Workspace, currency: CurrencyCode): Transaction[] {
  const accounts = new Set(
    workspace.accounts.filter((entry) => entry.currency === currency).map((entry) => entry.id),
  )
  return workspace.transactions.filter((entry) => accounts.has(entry.accountId))
}

export function availableBalance(workspace: Workspace, currency: CurrencyCode): Money {
  return sum(
    workspace.accounts
      .filter((account) => account.currency === currency)
      .map((account) => account.closingBalance),
    currency,
  )
}

export function partyTotals(workspace: Workspace, currency: CurrencyCode): PartyTotals[] {
  const transactions = inCurrency(workspace, currency)
  const byParty = new Map<string, Transaction[]>()

  for (const entry of transactions) {
    const bucket = byParty.get(entry.counterpartyId)
    if (bucket) bucket.push(entry)
    else byParty.set(entry.counterpartyId, [entry])
  }

  return workspace.counterparties
    .map((counterparty) => {
      const entries = byParty.get(counterparty.id) ?? []
      const inflow = sum(
        entries.filter((entry) => entry.direction === 'in').map((entry) => entry.amount),
        currency,
      )
      const outflow = sum(
        entries.filter((entry) => entry.direction === 'out').map((entry) => entry.amount),
        currency,
      )
      const dates = entries.map((entry) => entry.date).sort()
      return {
        counterparty,
        inflow,
        outflow,
        net: subtract(inflow, outflow),
        count: entries.length,
        firstDate: dates[0] ?? null,
        lastDate: dates.at(-1) ?? null,
      }
    })
    .filter((entry) => entry.count > 0)
}

export function lentOutstanding(workspace: Workspace, currency: CurrencyCode): PartyTotals[] {
  return partyTotals(workspace, currency)
    .filter((entry) => entry.counterparty.role === 'lent')
    .filter((entry) => entry.net.minor < 0)
    .sort((left, right) => left.net.minor - right.net.minor)
}

export function monthlyTotals(workspace: Workspace, currency: CurrencyCode): MonthTotals[] {
  const roles = rolesOf(workspace)
  const buckets = new Map<string, MonthTotals>()

  for (const entry of inCurrency(workspace, currency)) {
    if (roles.get(entry.counterpartyId) === 'account') continue
    const month = monthKey(entry.date)
    const bucket = buckets.get(month) ?? {
      month,
      inflow: zero(currency),
      outflow: zero(currency),
      count: 0,
    }
    if (entry.direction === 'in') bucket.inflow = add(bucket.inflow, entry.amount)
    else bucket.outflow = add(bucket.outflow, entry.amount)
    bucket.count += 1
    buckets.set(month, bucket)
  }

  return [...buckets.values()].sort((left, right) => left.month.localeCompare(right.month))
}

export function spendingTransactions(workspace: Workspace, currency: CurrencyCode): Transaction[] {
  const roles = rolesOf(workspace)
  return inCurrency(workspace, currency).filter((entry) => {
    if (entry.direction !== 'out') return false
    const role = roles.get(entry.counterpartyId)
    return role === 'spending' || role === 'support' || role === 'unassigned'
  })
}

export function averageMonthlyOutflow(workspace: Workspace, currency: CurrencyCode): Money {
  const spending = spendingTransactions(workspace, currency)
  if (spending.length === 0) return zero(currency)

  const months = new Set(spending.map((entry) => monthKey(entry.date)))
  const recent = [...months].sort().slice(-RUNWAY_WINDOW_MONTHS)
  const window = new Set(recent)
  const total = sum(
    spending.filter((entry) => window.has(monthKey(entry.date))).map((entry) => entry.amount),
    currency,
  )
  return divideByCount(total, recent.length)
}

export function runway(workspace: Workspace, currency: CurrencyCode): Runway {
  const available = availableBalance(workspace, currency)
  const monthlyOutflow = averageMonthlyOutflow(workspace, currency)
  return {
    available,
    monthlyOutflow,
    months: isZero(monthlyOutflow) ? null : available.minor / monthlyOutflow.minor,
  }
}

export function decisions(workspace: Workspace, currency: CurrencyCode): Transaction[] {
  const monthly = averageMonthlyOutflow(workspace, currency)
  if (isZero(monthly)) return []
  const threshold = monthly.minor * DECISION_SHARE_OF_MONTH

  return spendingTransactions(workspace, currency)
    .filter((entry) => entry.amount.minor >= threshold)
    .sort((left, right) => right.date.localeCompare(left.date))
}

export function incomeRhythm(workspace: Workspace, currency: CurrencyCode): IncomeRhythm {
  const roles = rolesOf(workspace)
  const received = inCurrency(workspace, currency).filter(
    (entry) => entry.direction === 'in' && roles.get(entry.counterpartyId) === 'client',
  )

  const total = sum(
    received.map((entry) => entry.amount),
    currency,
  )
  const clients = partyTotals(workspace, currency)
    .filter((entry) => entry.counterparty.role === 'client')
    .sort((left, right) => right.inflow.minor - left.inflow.minor)

  const months = monthlyTotals(workspace, currency).map((month) => ({
    ...month,
    inflow: sum(
      received.filter((entry) => monthKey(entry.date) === month.month).map((entry) => entry.amount),
      currency,
    ),
  }))

  const dates = [...new Set(received.map((entry) => entry.date))].sort()
  let longestGapDays: number | null = null
  for (let index = 1; index < dates.length; index += 1) {
    const previous = dates[index - 1]
    const current = dates[index]
    if (previous === undefined || current === undefined) continue
    const gap = daysBetween(previous, current)
    if (longestGapDays === null || gap > longestGapDays) longestGapDays = gap
  }

  const top = clients[0]
  return {
    received: total,
    clients,
    months,
    longestGapDays,
    topClientShare: top ? ratio(top.inflow, total) : 0,
    monthsWithoutIncome: months.filter((month) => isZero(month.inflow)).length,
  }
}

export function overview(workspace: Workspace, currency: CurrencyCode): Overview {
  const months = monthlyTotals(workspace, currency)
  const available = availableBalance(workspace, currency)
  const outstanding = lentOutstanding(workspace, currency)
  const lent = sum(
    outstanding.map((entry) => ({ ...entry.net, minor: -entry.net.minor })),
    currency,
  )

  return {
    currency,
    available,
    lentOutstanding: lent,
    totalPosition: add(available, lent),
    currentMonth: months.at(-1) ?? null,
    months,
    runway: runway(workspace, currency),
    decisions: decisions(workspace, currency),
  }
}
