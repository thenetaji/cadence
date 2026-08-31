import { addDays, daysBetween, todayIso } from '../import/dates'
import { cadenceMonthlyFactor, occurrencesBetween } from '../model'
import type { IsoDate, Workspace } from '../model'
import { add, fromMinor, subtract, sum, zero, type CurrencyCode, type Money } from '../money'
import { availableBalance, averageMonthlyOutflow, inCurrency } from './summary'

const DAYS_IN_MONTH = 30.44

export interface ForecastPoint {
  date: IsoDate
  balance: Money
  /** True on days something scheduled lands, so a chart can mark them. */
  committed: boolean
}

export interface Forecast {
  from: IsoDate
  points: ForecastPoint[]
  /** The worst day in the window — the one worth knowing about. */
  lowest: ForecastPoint | null
  committedIn: Money
  committedOut: Money
  /** Ordinary day-to-day spending, per day, with scheduled bills taken out of it. */
  everydayDaily: Money
  endBalance: Money
  /** Days until the balance would first go below zero, if it would. */
  daysUntilEmpty: number | null
}

/**
 * Projects the balance forward: what is scheduled, plus ordinary spending at the rate
 * of the last few months. Bills already in the schedule are subtracted from that rate
 * so a monthly rent is not counted twice.
 */
export function forecast(
  workspace: Workspace,
  currency: CurrencyCode,
  days = 90,
  from: IsoDate = todayIso(),
): Forecast {
  const to = addDays(from, days)
  const occurrences = occurrencesBetween(workspace, from, to)

  const scheduledMonthlyOut = workspace.scheduled
    .filter((item) => !item.paused && item.direction === 'out')
    .reduce((total, item) => total + item.amount.minor * cadenceMonthlyFactor(item.cadence), 0)

  const everydayMonthly = Math.max(
    0,
    averageMonthlyOutflow(workspace, currency).minor - scheduledMonthlyOut,
  )
  const dailyMinor = everydayMonthly / DAYS_IN_MONTH

  const byDate = new Map<string, number>()
  for (const occurrence of occurrences) {
    if (occurrence.item.amount.currency !== currency) continue
    const delta =
      occurrence.item.direction === 'in' ? occurrence.item.amount.minor : -occurrence.item.amount.minor
    byDate.set(occurrence.date, (byDate.get(occurrence.date) ?? 0) + delta)
  }

  let running = availableBalance(workspace, currency).minor
  const points: ForecastPoint[] = [
    { date: from, balance: fromMinor(Math.round(running), currency), committed: byDate.has(from) },
  ]

  let daysUntilEmpty: number | null = running < 0 ? 0 : null
  for (let step = 1; step <= days; step += 1) {
    const date = addDays(from, step)
    running -= dailyMinor
    running += byDate.get(date) ?? 0
    if (daysUntilEmpty === null && running < 0) daysUntilEmpty = step
    points.push({
      date,
      balance: fromMinor(Math.round(running), currency),
      committed: byDate.has(date),
    })
  }

  const lowest = points.reduce<ForecastPoint | null>(
    (worst, point) => (worst === null || point.balance.minor < worst.balance.minor ? point : worst),
    null,
  )

  const committedIn = sum(
    occurrences
      .filter((entry) => entry.item.direction === 'in' && entry.item.amount.currency === currency)
      .map((entry) => entry.item.amount),
    currency,
  )
  const committedOut = sum(
    occurrences
      .filter((entry) => entry.item.direction === 'out' && entry.item.amount.currency === currency)
      .map((entry) => entry.item.amount),
    currency,
  )

  return {
    from,
    points,
    lowest,
    committedIn,
    committedOut,
    everydayDaily: fromMinor(Math.round(dailyMinor), currency),
    endBalance: points.at(-1)?.balance ?? zero(currency),
    daysUntilEmpty,
  }
}

export interface BalancePoint {
  date: IsoDate
  balance: Money
}

/**
 * The total across every account, day by day, back through the transactions on record.
 * Only days with movement produce a point; a chart can hold the line between them.
 */
export function balanceHistory(
  workspace: Workspace,
  currency: CurrencyCode,
  limitDays: number | null = null,
): BalancePoint[] {
  const transactions = inCurrency(workspace, currency)
  if (transactions.length === 0) return []

  const opening = sum(
    workspace.accounts
      .filter((account) => account.currency === currency)
      .map((account) => account.openingBalance),
    currency,
  )

  const points: BalancePoint[] = []
  let running = opening
  let currentDate = transactions[0]?.date ?? ''

  for (const entry of transactions) {
    if (entry.date !== currentDate) {
      points.push({ date: currentDate, balance: running })
      currentDate = entry.date
    }
    running = entry.direction === 'in' ? add(running, entry.amount) : subtract(running, entry.amount)
  }
  points.push({ date: currentDate, balance: running })

  if (limitDays === null) return points
  const last = points.at(-1)?.date
  if (last === undefined) return points
  return points.filter((point) => daysBetween(point.date, last) <= limitDays)
}
