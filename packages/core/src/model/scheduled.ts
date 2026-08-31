import { addDays, addMonths, todayIso } from '../import/dates'
import { isNegative, isZero, type Money } from '../money'
import { UnknownAccountError } from './accounts'
import { addTransaction, resolveCounterparty, type TransactionInput } from './entries'
import { stableId } from './id'
import type { Cadence, Channel, Direction, IsoDate, ScheduledItem, Workspace } from './types'

const CATCH_UP_LIMIT = 5_000
const WINDOW_LIMIT = 400

export class UnknownScheduledItemError extends Error {
  constructor(id: string) {
    super(`No scheduled item with id ${id}`)
    this.name = 'UnknownScheduledItemError'
  }
}

export interface ScheduledInput {
  label: string
  accountId: string
  counterpartyName: string
  direction: Direction
  amount: Money
  channel: Channel
  cadence: Cadence
  nextDate: IsoDate
  endDate: IsoDate | null
  note: string
}

export interface Occurrence {
  item: ScheduledItem
  date: IsoDate
}

export function advanceDate(date: IsoDate, cadence: Cadence): IsoDate {
  switch (cadence) {
    case 'weekly':
      return addDays(date, 7)
    case 'fortnightly':
      return addDays(date, 14)
    case 'monthly':
      return addMonths(date, 1)
    case 'quarterly':
      return addMonths(date, 3)
    case 'yearly':
      return addMonths(date, 12)
  }
}

export function cadenceMonthlyFactor(cadence: Cadence): number {
  switch (cadence) {
    case 'weekly':
      return 52 / 12
    case 'fortnightly':
      return 26 / 12
    case 'monthly':
      return 1
    case 'quarterly':
      return 1 / 3
    case 'yearly':
      return 1 / 12
  }
}

export function addScheduled(workspace: Workspace, input: ScheduledInput): Workspace {
  if (!workspace.accounts.some((entry) => entry.id === input.accountId)) {
    throw new UnknownAccountError(input.accountId)
  }
  if (isZero(input.amount) || isNegative(input.amount)) {
    throw new RangeError('A scheduled amount must be greater than zero')
  }

  const resolved = resolveCounterparty(workspace, input.counterpartyName)
  const item: ScheduledItem = {
    id: stableId('scheduled', input.label, input.accountId, input.amount.minor, input.nextDate),
    label: input.label.trim() === '' ? input.counterpartyName.trim() : input.label.trim(),
    accountId: input.accountId,
    counterpartyId: resolved.counterpartyId,
    direction: input.direction,
    amount: input.amount,
    channel: input.channel,
    cadence: input.cadence,
    nextDate: input.nextDate,
    endDate: input.endDate,
    note: input.note,
    paused: false,
  }

  return {
    ...resolved.workspace,
    scheduled: [...resolved.workspace.scheduled, item].sort((left, right) =>
      left.nextDate.localeCompare(right.nextDate),
    ),
  }
}

export function updateScheduled(
  workspace: Workspace,
  itemId: string,
  patch: Partial<Omit<ScheduledItem, 'id'>>,
): Workspace {
  if (!workspace.scheduled.some((entry) => entry.id === itemId)) {
    throw new UnknownScheduledItemError(itemId)
  }
  return {
    ...workspace,
    scheduled: workspace.scheduled
      .map((entry) => (entry.id === itemId ? { ...entry, ...patch } : entry))
      .sort((left, right) => left.nextDate.localeCompare(right.nextDate)),
  }
}

export function removeScheduled(workspace: Workspace, itemId: string): Workspace {
  return {
    ...workspace,
    scheduled: workspace.scheduled.filter((entry) => entry.id !== itemId),
  }
}

function stillRunning(item: ScheduledItem, date: IsoDate): boolean {
  return !item.paused && (item.endDate === null || date <= item.endDate)
}

/** Everything expected on or before `date` and not yet recorded. */
export function dueScheduled(workspace: Workspace, date: IsoDate = todayIso()): ScheduledItem[] {
  return workspace.scheduled
    .filter((item) => stillRunning(item, item.nextDate) && item.nextDate <= date)
    .sort((left, right) => left.nextDate.localeCompare(right.nextDate))
}

/** Every occurrence expected between two dates, one entry per repeat. */
export function occurrencesBetween(
  workspace: Workspace,
  from: IsoDate,
  to: IsoDate,
): Occurrence[] {
  const found: Occurrence[] = []

  for (const item of workspace.scheduled) {
    if (item.paused) continue
    let date = item.nextDate
    // A run left alone for years still repeats inside the window, so catching up
    // is allowed to take many more steps than the window itself can hold.
    for (let step = 0; date < from && step < CATCH_UP_LIMIT; step += 1) {
      date = advanceDate(date, item.cadence)
    }
    for (let step = 0; date <= to && step < WINDOW_LIMIT; step += 1) {
      if (item.endDate !== null && date > item.endDate) break
      found.push({ item, date })
      date = advanceDate(date, item.cadence)
    }
  }

  return found.sort((left, right) => left.date.localeCompare(right.date))
}

function inputFor(workspace: Workspace, item: ScheduledItem, date: IsoDate): TransactionInput {
  const party = workspace.counterparties.find((entry) => entry.id === item.counterpartyId)
  return {
    accountId: item.accountId,
    date,
    direction: item.direction,
    amount: item.amount,
    counterpartyName: party?.displayName ?? item.label,
    channel: item.channel,
    description: item.label,
    note: item.note,
    reference: '',
  }
}

/**
 * Writes the occurrence into the ledger and moves the item on to its next date.
 * The amount can differ from the expected one — a bill rarely lands to the penny —
 * and the schedule keeps its own figure for what comes next.
 */
export function recordScheduled(
  workspace: Workspace,
  itemId: string,
  options: { date?: IsoDate; amount?: Money } = {},
): Workspace {
  const item = workspace.scheduled.find((entry) => entry.id === itemId)
  if (!item) throw new UnknownScheduledItemError(itemId)

  const date = options.date ?? item.nextDate
  const input = inputFor(workspace, item, date)
  const added = addTransaction(workspace, {
    ...input,
    amount: options.amount ?? item.amount,
  })

  return skipScheduled(added.workspace, itemId)
}

/** Moves an item on without writing anything down. */
export function skipScheduled(workspace: Workspace, itemId: string): Workspace {
  const item = workspace.scheduled.find((entry) => entry.id === itemId)
  if (!item) throw new UnknownScheduledItemError(itemId)

  const nextDate = advanceDate(item.nextDate, item.cadence)
  const finished = item.endDate !== null && nextDate > item.endDate

  return updateScheduled(workspace, itemId, { nextDate, paused: finished ? true : item.paused })
}
