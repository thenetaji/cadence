import type { CsvTable } from './csv'
import { detectDateOrder, parseDate, type DateOrder } from './dates'

export type AmountShape = 'signed' | 'split'

export interface ColumnMapping {
  date: number
  description: number
  amountShape: AmountShape
  amount: number
  debit: number
  credit: number
  balance: number
  reference: number
  dateOrder: DateOrder
  outflowIsPositive: boolean
}

const UNMAPPED = -1

interface Candidate {
  keywords: string[]
  exclude?: string[]
}

const DATE: Candidate = { keywords: ['date', 'posted', 'timestamp', 'time', 'datum', 'fecha'] }
const DESCRIPTION: Candidate = {
  keywords: ['description', 'narration', 'details', 'particular', 'payee', 'memo', 'reference text', 'remit'],
}
const AMOUNT: Candidate = {
  keywords: ['amount', 'value', 'betrag', 'importe', 'montant'],
  exclude: ['balance'],
}
const DEBIT: Candidate = { keywords: ['debit', 'withdrawal', 'paid out', 'money out', 'outflow', 'spent'] }
const CREDIT: Candidate = { keywords: ['credit', 'deposit', 'paid in', 'money in', 'inflow', 'received'] }
const BALANCE: Candidate = { keywords: ['balance', 'running', 'saldo'] }
const REFERENCE: Candidate = { keywords: ['reference', 'ref', 'transaction id', 'cheque', 'check'] }

export function suggestMapping(table: CsvTable, locale = 'en-US'): ColumnMapping {
  const headers = table.header.map((cell) => cell.toLowerCase())
  const sample = table.rows.slice(0, 40)

  const debit = findColumn(headers, DEBIT)
  const credit = findColumn(headers, CREDIT)
  const hasSplit = debit !== UNMAPPED && credit !== UNMAPPED

  const date = findColumn(headers, DATE) !== UNMAPPED
    ? findColumn(headers, DATE)
    : findByContent(sample, looksLikeDate)

  const amount = findColumn(headers, AMOUNT) !== UNMAPPED
    ? findColumn(headers, AMOUNT)
    : findByContent(sample, looksLikeAmount, [date, debit, credit])

  const description = findColumn(headers, DESCRIPTION) !== UNMAPPED
    ? findColumn(headers, DESCRIPTION)
    : findByContent(sample, looksLikeText, [date])

  const dateOrder = detectDateOrder(
    date === UNMAPPED ? [] : sample.map((row) => row[date] ?? ''),
    locale,
  )

  return {
    date,
    description,
    amountShape: hasSplit ? 'split' : 'signed',
    amount: hasSplit ? UNMAPPED : amount,
    debit,
    credit,
    balance: findColumn(headers, BALANCE),
    reference: findColumn(headers, REFERENCE),
    dateOrder,
    outflowIsPositive: false,
  }
}

export function isMappingComplete(mapping: ColumnMapping): boolean {
  if (mapping.date === UNMAPPED || mapping.description === UNMAPPED) return false
  if (mapping.amountShape === 'signed') return mapping.amount !== UNMAPPED
  return mapping.debit !== UNMAPPED || mapping.credit !== UNMAPPED
}

function findColumn(headers: readonly string[], candidate: Candidate): number {
  for (const keyword of candidate.keywords) {
    const index = headers.findIndex(
      (header) =>
        header.includes(keyword) &&
        !(candidate.exclude ?? []).some((word) => header.includes(word)),
    )
    if (index !== UNMAPPED) return index
  }
  return UNMAPPED
}

function findByContent(
  rows: readonly string[][],
  predicate: (value: string) => boolean,
  exclude: readonly number[] = [],
): number {
  const width = rows[0]?.length ?? 0
  let best = UNMAPPED
  let bestHits = 0

  for (let column = 0; column < width; column += 1) {
    if (exclude.includes(column)) continue
    const hits = rows.filter((row) => predicate(row[column] ?? '')).length
    if (hits > bestHits) {
      bestHits = hits
      best = column
    }
  }
  return bestHits >= Math.max(1, rows.length / 2) ? best : UNMAPPED
}

function looksLikeDate(value: string): boolean {
  return parseDate(value, 'dmy') !== null
}

function looksLikeAmount(value: string): boolean {
  const trimmed = value.trim()
  if (trimmed === '') return false
  return /^[-+(]?[\d.,\s]+\)?$/.test(trimmed) && /\d/.test(trimmed)
}

function looksLikeText(value: string): boolean {
  return /[a-z]{3}/i.test(value)
}
