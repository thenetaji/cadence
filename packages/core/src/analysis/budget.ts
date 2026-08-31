import { daysBetween, daysLeftInMonth, endOfMonth, monthKey, todayIso } from '../import/dates'
import type { IsoDate, Workspace } from '../model'
import { divideByCount, fromMinor, isZero, ratio, subtract, sum, zero, type CurrencyCode, type Money } from '../money'
import { lentOutstanding, spendingTransactions, type PartyTotals } from './summary'

export interface MonthProgress {
  month: string
  target: Money | null
  spent: Money
  /** What is left of the target, negative once it is passed. Null without a target. */
  remaining: Money | null
  daysLeft: number
  /** What each remaining day can hold to finish on target. */
  dailyAllowance: Money | null
  /**
   * Spending so far against the share of the month gone. Above 1 means going faster
   * than the target allows, below 1 means slower.
   */
  pace: number | null
}

export function monthProgress(
  workspace: Workspace,
  currency: CurrencyCode,
  today: IsoDate = todayIso(),
): MonthProgress {
  const month = monthKey(today)
  const spent = sum(
    spendingTransactions(workspace, currency)
      .filter((entry) => monthKey(entry.date) === month)
      .map((entry) => entry.amount),
    currency,
  )

  const target = workspace.plan.monthlySpendingTarget
  const daysLeft = daysLeftInMonth(today)
  const daysInMonth = daysBetween(`${month}-01`, endOfMonth(month)) + 1
  const elapsed = (daysInMonth - daysLeft + 1) / daysInMonth

  if (target === null || target.currency !== currency || isZero(target)) {
    return {
      month,
      target: null,
      spent,
      remaining: null,
      daysLeft,
      dailyAllowance: null,
      pace: null,
    }
  }

  const remaining = subtract(target, spent)
  return {
    month,
    target,
    spent,
    remaining,
    daysLeft,
    dailyAllowance:
      remaining.minor <= 0 ? zero(currency) : divideByCount(remaining, Math.max(1, daysLeft)),
    pace: elapsed === 0 ? null : ratio(spent, target) / elapsed,
  }
}

export interface SpendingSlice {
  counterpartyId: string
  name: string
  total: Money
  count: number
  share: number
}

/** Where the money went over a window, largest first. */
export function spendingBreakdown(
  workspace: Workspace,
  currency: CurrencyCode,
  since: IsoDate,
): SpendingSlice[] {
  const names = new Map(workspace.counterparties.map((entry) => [entry.id, entry.displayName]))
  const totals = new Map<string, { total: number; count: number }>()

  for (const entry of spendingTransactions(workspace, currency)) {
    if (entry.date < since) continue
    const bucket = totals.get(entry.counterpartyId) ?? { total: 0, count: 0 }
    bucket.total += entry.amount.minor
    bucket.count += 1
    totals.set(entry.counterpartyId, bucket)
  }

  const overall = [...totals.values()].reduce((running, bucket) => running + bucket.total, 0)

  return [...totals.entries()]
    .map(([counterpartyId, bucket]) => ({
      counterpartyId,
      name: names.get(counterpartyId) ?? 'Unnamed',
      total: fromMinor(bucket.total, currency),
      count: bucket.count,
      share: overall === 0 ? 0 : bucket.total / overall,
    }))
    .sort((left, right) => right.total.minor - left.total.minor)
}

export interface LendingDue {
  entry: PartyTotals
  outstanding: Money
  dueDate: IsoDate | null
  /** Negative once the date has passed. */
  daysUntilDue: number | null
}

/** Money lent out, with anything you gave a date attached to it ordered by urgency. */
export function lendingDue(
  workspace: Workspace,
  currency: CurrencyCode,
  today: IsoDate = todayIso(),
): LendingDue[] {
  return lentOutstanding(workspace, currency)
    .map((entry) => {
      const dueDate = entry.counterparty.dueDate
      return {
        entry,
        outstanding: fromMinor(-entry.net.minor, currency),
        dueDate,
        daysUntilDue: dueDate === null ? null : daysBetween(today, dueDate),
      }
    })
    .sort((left, right) => {
      if (left.daysUntilDue === null && right.daysUntilDue === null) {
        return right.outstanding.minor - left.outstanding.minor
      }
      if (left.daysUntilDue === null) return 1
      if (right.daysUntilDue === null) return -1
      return left.daysUntilDue - right.daysUntilDue
    })
}
