import type { Transaction, Workspace } from '../model'
import { toMajor } from '../money'

const HEADER = [
  'Date',
  'Account',
  'Direction',
  'Amount',
  'Currency',
  'Name',
  'Label',
  'Channel',
  'Description',
  'Note',
  'Reference',
] as const

function quote(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

/**
 * Every transaction as one CSV row, in the order they happened. Written for a
 * spreadsheet or an accountant — the JSON backup is what Cadence reads back.
 */
export function toCsv(workspace: Workspace): string {
  const accounts = new Map(workspace.accounts.map((entry) => [entry.id, entry.label]))
  const parties = new Map(workspace.counterparties.map((entry) => [entry.id, entry]))

  const lines = workspace.transactions.map((entry: Transaction) => {
    const party = parties.get(entry.counterpartyId)
    return [
      entry.date,
      accounts.get(entry.accountId) ?? '',
      entry.direction,
      toMajor(entry.amount).toFixed(2),
      entry.amount.currency,
      party?.displayName ?? '',
      party?.role ?? '',
      entry.channel,
      entry.description,
      entry.note,
      entry.reference,
    ]
      .map((cell) => quote(String(cell)))
      .join(',')
  })

  return [HEADER.join(','), ...lines].join('\n')
}
