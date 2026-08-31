import type { Channel, DraftStatement, DraftTransaction } from '../model'
import { absolute, isNegative, parseAmount, type CurrencyCode, type Money } from '../money'
import type { CsvTable } from './csv'
import { parseDate } from './dates'
import { isMappingComplete, type ColumnMapping } from './mapping'

export interface BuildOptions {
  institution: string
  reference: string
  currency: CurrencyCode
}

export interface RowProblem {
  row: number
  reason: string
}

export interface BuildResult {
  statement: DraftStatement
  skipped: RowProblem[]
}

export class IncompleteMappingError extends Error {
  constructor() {
    super('Date, description and an amount column are all required')
    this.name = 'IncompleteMappingError'
  }
}

const CHANNEL_HINTS: readonly (readonly [Channel, RegExp])[] = [
  ['atm', /\batm\b|cash withdrawal/i],
  ['card', /\bcard\b|pos |visa|mastercard|contactless/i],
  ['fee', /\bfee\b|charge|commission|sms charge/i],
  ['interest', /\binterest\b/i],
  ['transfer', /transfer|neft|imps|rtgs|upi|sepa|ach|wire|zelle|faster payment/i],
]

export function buildStatement(
  table: CsvTable,
  mapping: ColumnMapping,
  options: BuildOptions,
): BuildResult {
  if (!isMappingComplete(mapping)) throw new IncompleteMappingError()

  const transactions: DraftTransaction[] = []
  const skipped: RowProblem[] = []

  table.rows.forEach((row, index) => {
    const rawDate = cell(row, mapping.date)
    const date = parseDate(rawDate, mapping.dateOrder)
    if (date === null) {
      skipped.push({ row: index + 2, reason: `Unreadable date ${JSON.stringify(rawDate)}` })
      return
    }

    const signed = readAmount(row, mapping, options.currency)
    if (signed === null) {
      skipped.push({ row: index + 2, reason: 'No amount on this row' })
      return
    }
    if (signed.minor === 0) return

    const description = cell(row, mapping.description).trim()
    transactions.push({
      date,
      direction: isNegative(signed) ? 'out' : 'in',
      amount: absolute(signed),
      balance: readOptionalAmount(row, mapping.balance, options.currency),
      channel: channelFor(description),
      counterpartyName: description,
      description,
      reference: cell(row, mapping.reference).trim(),
    })
  })

  transactions.sort((left, right) => left.date.localeCompare(right.date))

  return {
    statement: {
      institution: options.institution,
      reference: options.reference,
      currency: options.currency,
      transactions,
    },
    skipped,
  }
}

function cell(row: readonly string[], column: number): string {
  return column < 0 ? '' : (row[column] ?? '')
}

function readAmount(
  row: readonly string[],
  mapping: ColumnMapping,
  currency: CurrencyCode,
): Money | null {
  if (mapping.amountShape === 'signed') {
    const value = readOptionalAmount(row, mapping.amount, currency)
    if (value === null) return null
    return mapping.outflowIsPositive ? { ...value, minor: -value.minor } : value
  }

  const debit = readOptionalAmount(row, mapping.debit, currency)
  const credit = readOptionalAmount(row, mapping.credit, currency)

  if (debit !== null && debit.minor !== 0) {
    return { ...debit, minor: -Math.abs(debit.minor) }
  }
  if (credit !== null && credit.minor !== 0) {
    return { ...credit, minor: Math.abs(credit.minor) }
  }
  return null
}

function readOptionalAmount(
  row: readonly string[],
  column: number,
  currency: CurrencyCode,
): Money | null {
  const raw = cell(row, column).trim()
  if (raw === '') return null
  try {
    return parseAmount(raw, currency)
  } catch {
    return null
  }
}

function channelFor(description: string): Channel {
  for (const [channel, pattern] of CHANNEL_HINTS) {
    if (pattern.test(description)) return channel
  }
  return 'other'
}
