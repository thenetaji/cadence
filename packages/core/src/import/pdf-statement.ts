import type { Channel, DraftStatement, DraftTransaction, Direction } from '../model'
import { parseAmount, type CurrencyCode, type Money } from '../money'
import { parseDate } from './dates'
import { extractTextLines, type TextLine } from './pdf-text'

export interface StatementParser {
  id: string
  label: string
  recognises(lines: readonly TextLine[]): boolean
  parse(lines: readonly TextLine[], currency: CurrencyCode): DraftStatement
}

export class UnrecognisedStatementError extends Error {
  constructor() {
    super('No parser recognises this statement layout')
    this.name = 'UnrecognisedStatementError'
  }
}

const HEADER_ROW = /^Date\s+Description\s+Debit\s+Credit\s+Balance$/i
const FOOTER_ROW = /^Totals:/i
const ACCOUNT_LINE = /^Account Number:\s*(.+)$/i
const PERIOD_LINE = /^Statement Period:/i
const TRANSACTION_ROW =
  /^(\d{1,2} [A-Za-z]{3} \d{4})\s+(.+?)\s+(-|\d+\.\d{2})\s+(-|\d+\.\d{2})\s+(\d+\.\d{2})$/

const CHANNEL_HINTS: readonly (readonly [Channel, RegExp])[] = [
  ['atm', /\batm\b/i],
  ['card', /\bpurchase\b|\bcharge\b/i],
  ['fee', /\bfee\b/i],
  ['interest', /\binterest\b/i],
  ['transfer', /\btransfer\b|\bwire\b|\bdeposit\b|\bpayroll\b/i],
]

export const sampleBankParser: StatementParser = {
  id: 'sample-bank',
  label: 'Cadence Community Bank (sample)',
  recognises: recognisesSampleBank,
  parse: parseSampleBank,
}

export function selectParser(
  parsers: readonly StatementParser[],
  lines: readonly TextLine[],
): StatementParser {
  const match = parsers.find((parser) => parser.recognises(lines))
  if (!match) throw new UnrecognisedStatementError()
  return match
}

export async function parsePdfStatement(
  source: ArrayBuffer,
  currency: CurrencyCode,
  parsers: readonly StatementParser[],
): Promise<DraftStatement> {
  const lines = await extractTextLines(source)
  const parser = selectParser(parsers, lines)
  return parser.parse(lines, currency)
}

function recognisesSampleBank(lines: readonly TextLine[]): boolean {
  return lines.some((line) => HEADER_ROW.test(line.text.trim()))
}

function parseSampleBank(lines: readonly TextLine[], currency: CurrencyCode): DraftStatement {
  let institution = ''
  let reference = ''
  let inTable = false
  const transactions: DraftTransaction[] = []

  for (const line of lines) {
    const text = line.text.trim()
    if (text === '') continue

    const account = ACCOUNT_LINE.exec(text)
    if (account) {
      reference = (account[1] ?? '').trim()
      continue
    }
    if (PERIOD_LINE.test(text)) continue

    if (HEADER_ROW.test(text)) {
      inTable = true
      continue
    }

    if (institution === '') {
      institution = text
      continue
    }

    if (!inTable) continue

    if (FOOTER_ROW.test(text)) {
      inTable = false
      continue
    }

    const row = TRANSACTION_ROW.exec(text)
    if (row) {
      transactions.push(buildTransaction(row, currency))
      continue
    }

    appendContinuation(transactions, text)
  }

  transactions.sort((left, right) => left.date.localeCompare(right.date))

  return { institution, reference, currency, transactions }
}

function buildTransaction(match: RegExpExecArray, currency: CurrencyCode): DraftTransaction {
  const date = parseDate(match[1] ?? '', 'dmy')
  if (date === null) throw new Error(`Unreadable transaction date ${JSON.stringify(match[1])}`)

  const description = (match[2] ?? '').trim()
  const debit = readColumn(match[3] ?? '-', currency)
  const credit = readColumn(match[4] ?? '-', currency)
  const balance = readColumn(match[5] ?? '-', currency)
  const { direction, amount } = directionAndAmount(debit, credit)

  return {
    date,
    direction,
    amount,
    balance,
    channel: channelFor(description),
    counterpartyName: description,
    description,
    reference: '',
  }
}

function readColumn(text: string, currency: CurrencyCode): Money | null {
  return text === '-' ? null : parseAmount(text, currency)
}

function directionAndAmount(debit: Money | null, credit: Money | null): { direction: Direction; amount: Money } {
  if (debit !== null && credit === null) return { direction: 'out', amount: debit }
  if (credit !== null && debit === null) return { direction: 'in', amount: credit }
  throw new Error('Expected exactly one of debit or credit to carry a value')
}

function appendContinuation(transactions: readonly DraftTransaction[], text: string): void {
  const previous = transactions[transactions.length - 1]
  if (previous === undefined) return
  previous.description = `${previous.description} ${text}`
  previous.counterpartyName = previous.description
}

function channelFor(description: string): Channel {
  for (const [channel, pattern] of CHANNEL_HINTS) {
    if (pattern.test(description)) return channel
  }
  return 'other'
}
