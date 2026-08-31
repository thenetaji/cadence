import { describe, expect, it } from 'vitest'
import {
  extractTextLines,
  parsePdfStatement,
  sampleBankParser,
  type TextLine,
} from '../src/import'
import { sampleStatementData, sampleStatementPdf } from '../src/import/pdf-fixture'

function bytesEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false
  return left.every((value, index) => value === right[index])
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  return buffer
}

function expectedTotals() {
  const { transactions } = sampleStatementData()
  const totalDebitMinor = transactions.reduce((total, row) => total + (row.debitMinor ?? 0), 0)
  const totalCreditMinor = transactions.reduce((total, row) => total + (row.creditMinor ?? 0), 0)
  return { transactions, totalDebitMinor, totalCreditMinor }
}

describe('sampleStatementPdf', () => {
  it('produces identical bytes on every run', async () => {
    const first = await sampleStatementPdf()
    const second = await sampleStatementPdf()
    expect(bytesEqual(first, second)).toBe(true)
  })

  it('spans at least three pages', async () => {
    const bytes = await sampleStatementPdf()
    const lines = await extractTextLines(toArrayBuffer(bytes))
    const pages = new Set(lines.map((line) => line.page))
    expect(pages.size).toBeGreaterThanOrEqual(3)
  })
})

describe('parsePdfStatement with sampleBankParser', () => {
  it('reads the exact transaction count from the generated statement', async () => {
    const bytes = await sampleStatementPdf()
    const statement = await parsePdfStatement(
      toArrayBuffer(bytes),
      'USD',
      [sampleBankParser],
    )

    const { transactions } = expectedTotals()
    expect(statement.transactions).toHaveLength(transactions.length)
  })

  it('sums debits and credits to the totals the generator used', async () => {
    const bytes = await sampleStatementPdf()
    const statement = await parsePdfStatement(
      toArrayBuffer(bytes),
      'USD',
      [sampleBankParser],
    )

    const { totalDebitMinor, totalCreditMinor } = expectedTotals()
    const summedDebitMinor = statement.transactions
      .filter((transaction) => transaction.direction === 'out')
      .reduce((total, transaction) => total + transaction.amount.minor, 0)
    const summedCreditMinor = statement.transactions
      .filter((transaction) => transaction.direction === 'in')
      .reduce((total, transaction) => total + transaction.amount.minor, 0)

    expect(summedDebitMinor).toBe(totalDebitMinor)
    expect(summedCreditMinor).toBe(totalCreditMinor)
  })

  it('reassembles a wrapped description with no missing or doubled spaces', async () => {
    const bytes = await sampleStatementPdf()
    const statement = await parsePdfStatement(
      toArrayBuffer(bytes),
      'USD',
      [sampleBankParser],
    )

    const wrappedDescription =
      'WIRE TRANSFER INTERNATIONAL SUPPLIER PAYMENT REFERENCE 88213 PROCESSING'
    const matches = statement.transactions.filter(
      (transaction) => transaction.description === wrappedDescription,
    )

    expect(matches.length).toBeGreaterThan(0)
    for (const transaction of matches) {
      expect(transaction.description).not.toMatch(/  /)
      expect(transaction.description).toBe(wrappedDescription)
    }
  })

  it('sorts transactions by date even though two source rows were out of order', async () => {
    const bytes = await sampleStatementPdf()
    const statement = await parsePdfStatement(
      toArrayBuffer(bytes),
      'USD',
      [sampleBankParser],
    )

    const dates = statement.transactions.map((transaction) => transaction.date)
    const sorted = [...dates].sort((left, right) => left.localeCompare(right))
    expect(dates).toEqual(sorted)
  })

  it('carries the institution and account number through as statement metadata', async () => {
    const bytes = await sampleStatementPdf()
    const statement = await parsePdfStatement(
      toArrayBuffer(bytes),
      'USD',
      [sampleBankParser],
    )
    const data = sampleStatementData()

    expect(statement.institution).toBe(data.institution)
    expect(statement.reference).toBe(data.accountNumber)
  })
})

describe('sampleBankParser.recognises', () => {
  it('returns false for a PDF with unrelated content', () => {
    const unrelatedLines: TextLine[] = [
      { page: 1, y: 700, x: 50, text: 'Acme Invoicing Co.' },
      { page: 1, y: 680, x: 50, text: 'Invoice Number 00219' },
      { page: 1, y: 660, x: 50, text: 'Item Quantity Unit Price Total' },
    ]

    expect(sampleBankParser.recognises(unrelatedLines)).toBe(false)
  })

  it('returns true once the sample statement column header is present', async () => {
    const bytes = await sampleStatementPdf()
    const lines = await extractTextLines(toArrayBuffer(bytes))
    expect(sampleBankParser.recognises(lines)).toBe(true)
  })
})
