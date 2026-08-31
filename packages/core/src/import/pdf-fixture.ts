// Test-only. Deliberately not exported from src/import/index.ts: pdf-lib is a build
// dependency of the fixture, not of the app, and must never reach the bundle.
import { PDFDocument, StandardFonts, type PDFFont, type PDFPage } from 'pdf-lib'
import type { IsoDate } from '../model'
import { fromMinor, toMajor } from '../money'

export interface SampleTransaction {
  date: IsoDate
  description: string
  debitMinor: number | null
  creditMinor: number | null
  balanceMinor: number
}

export interface SampleStatementData {
  institution: string
  accountNumber: string
  periodLabel: string
  transactions: readonly SampleTransaction[]
}

const INSTITUTION = 'Cadence Community Bank'
const ACCOUNT_NUMBER = '4471-0029-8834'
const TRANSACTION_COUNT = 60
const OPENING_BALANCE_MINOR = 500_000
const START_DATE_UTC = Date.UTC(2026, 1, 1)
const DAY_MS = 86_400_000

const MONTH_ABBREVIATIONS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

// A handful of these run long enough to force a wrap onto a continuation
// line, which is one of the two real-world quirks this fixture must exercise.
const MERCHANTS = [
  'AMAZON.COM MARKETPLACE PURCHASE',
  'STARBUCKS COFFEE #4471 SEATTLE WA',
  'PAYROLL DEPOSIT ACME CORP',
  'ATM WITHDRAWAL BRANCH 12',
  'MONTHLY ACCOUNT MAINTENANCE FEE',
  'TRANSFER TO SAVINGS ACCOUNT 8834',
  'WIRE TRANSFER INTERNATIONAL SUPPLIER PAYMENT REFERENCE 88213 PROCESSING',
  'INTEREST PAYMENT CREDIT',
  'MOBILE CHECK DEPOSIT REF 55231',
  'UTILITY BILL PAYMENT PACIFIC POWER AND LIGHT COMPANY AUTOPAY',
  'GROCERY STORE PURCHASE TRADER JOES #221',
  'RESTAURANT CHARGE THE BLUE PLATE BISTRO DOWNTOWN LOCATION',
  'INSURANCE PREMIUM AUTO POLICY MONTHLY INSTALLMENT PAYMENT PROCESSED',
  'SUBSCRIPTION RENEWAL STREAMING SERVICE MONTHLY PLAN',
  'CASH DEPOSIT BRANCH TELLER WINDOW 3',
]

const PAGE_WIDTH = 612
const PAGE_HEIGHT = 792
const MARGIN = 50
const LINE_HEIGHT = 26
const ROW_FONT_SIZE = 9
const HEADER_FONT_SIZE = 10
const TITLE_FONT_SIZE = 16
const DESCRIPTION_WIDTH = 200

const COLUMN_X = {
  date: MARGIN,
  description: MARGIN + 90,
  debit: MARGIN + 300,
  credit: MARGIN + 360,
  balance: MARGIN + 420,
}

interface BaseRow {
  date: IsoDate
  description: string
  debitMinor: number | null
  creditMinor: number | null
}

export function sampleStatementData(): SampleStatementData {
  const transactions = withBalances(swapTwoRows(buildBaseRows()))
  const dates = transactions.map((row) => row.date).sort((left, right) => left.localeCompare(right))
  const firstDate = dates[0] ?? ''
  const lastDate = dates[dates.length - 1] ?? ''

  return {
    institution: INSTITUTION,
    accountNumber: ACCOUNT_NUMBER,
    periodLabel: `${formatSampleDate(firstDate)} - ${formatSampleDate(lastDate)}`,
    transactions,
  }
}

export async function sampleStatementPdf(): Promise<Uint8Array> {
  const data = sampleStatementData()
  const doc = await PDFDocument.create({ updateMetadata: false })
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold)

  let cursor = startFirstPage(doc, font, boldFont, data)
  for (const row of data.transactions) {
    cursor = drawTransactionRow(cursor, doc, font, boldFont, row)
  }
  drawFooter(cursor, font, data.transactions)

  return doc.save()
}

function buildBaseRows(): BaseRow[] {
  const rows: BaseRow[] = []
  let dayOffset = 0

  for (let index = 0; index < TRANSACTION_COUNT; index += 1) {
    const description = MERCHANTS[index % MERCHANTS.length] ?? ''
    const amountMinor = amountForIndex(index)
    const isCredit = isCreditDescription(description)

    rows.push({
      date: dateForDayOffset(dayOffset),
      description,
      debitMinor: isCredit ? null : amountMinor,
      creditMinor: isCredit ? amountMinor : null,
    })
    dayOffset += 1 + (index % 3)
  }
  return rows
}

function isCreditDescription(description: string): boolean {
  return (
    description.includes('DEPOSIT') ||
    description.includes('PAYROLL') ||
    description.includes('INTEREST')
  )
}

function amountForIndex(index: number): number {
  return 500 + ((index * 137) % 9500)
}

// Real statements occasionally print two rows a day apart from each other
// out of order; swapping one adjacent pair reproduces that without disturbing
// the rest of the sequence.
function swapTwoRows(rows: readonly BaseRow[]): BaseRow[] {
  const swapped = [...rows]
  const left = swapped[20]
  const right = swapped[21]
  if (left !== undefined && right !== undefined) {
    swapped[20] = right
    swapped[21] = left
  }
  return swapped
}

function withBalances(rows: readonly BaseRow[]): SampleTransaction[] {
  let balance = OPENING_BALANCE_MINOR
  return rows.map((row) => {
    balance += (row.creditMinor ?? 0) - (row.debitMinor ?? 0)
    return { ...row, balanceMinor: balance }
  })
}

function dateForDayOffset(offset: number): IsoDate {
  const date = new Date(START_DATE_UTC + offset * DAY_MS)
  return date.toISOString().slice(0, 10)
}

function formatSampleDate(date: IsoDate): string {
  const [year, month, day] = date.split('-')
  const name = MONTH_ABBREVIATIONS[Number(month) - 1] ?? ''
  return `${day} ${name} ${year}`
}

function formatMinor(minor: number): string {
  return toMajor(fromMinor(minor, 'USD')).toFixed(2)
}

interface Cursor {
  page: PDFPage
  y: number
}

function startFirstPage(
  doc: PDFDocument,
  font: PDFFont,
  boldFont: PDFFont,
  data: SampleStatementData,
): Cursor {
  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  let y = PAGE_HEIGHT - MARGIN

  page.drawText(data.institution, { x: MARGIN, y, size: TITLE_FONT_SIZE, font: boldFont })
  y -= LINE_HEIGHT * 1.6
  page.drawText(`Account Number: ${data.accountNumber}`, { x: MARGIN, y, size: HEADER_FONT_SIZE, font })
  y -= LINE_HEIGHT
  page.drawText(`Statement Period: ${data.periodLabel}`, { x: MARGIN, y, size: HEADER_FONT_SIZE, font })
  y -= LINE_HEIGHT * 1.6

  return { page, y: drawColumnHeader(page, boldFont, y) }
}

function startNextPage(doc: PDFDocument, boldFont: PDFFont): Cursor {
  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  return { page, y: drawColumnHeader(page, boldFont, PAGE_HEIGHT - MARGIN) }
}

function drawColumnHeader(page: PDFPage, boldFont: PDFFont, y: number): number {
  page.drawText('Date', { x: COLUMN_X.date, y, size: HEADER_FONT_SIZE, font: boldFont })
  page.drawText('Description', { x: COLUMN_X.description, y, size: HEADER_FONT_SIZE, font: boldFont })
  page.drawText('Debit', { x: COLUMN_X.debit, y, size: HEADER_FONT_SIZE, font: boldFont })
  page.drawText('Credit', { x: COLUMN_X.credit, y, size: HEADER_FONT_SIZE, font: boldFont })
  page.drawText('Balance', { x: COLUMN_X.balance, y, size: HEADER_FONT_SIZE, font: boldFont })
  return y - LINE_HEIGHT * 1.4
}

function ensureRoom(cursor: Cursor, linesNeeded: number, doc: PDFDocument, boldFont: PDFFont): Cursor {
  if (cursor.y - linesNeeded * LINE_HEIGHT > MARGIN) return cursor
  return startNextPage(doc, boldFont)
}

function drawTransactionRow(
  cursor: Cursor,
  doc: PDFDocument,
  font: PDFFont,
  boldFont: PDFFont,
  row: SampleTransaction,
): Cursor {
  const wrapped = wrapText(row.description, font, ROW_FONT_SIZE, DESCRIPTION_WIDTH)
  const started = ensureRoom(cursor, wrapped.length, doc, boldFont)
  const [firstLine, ...continuationLines] = wrapped

  started.page.drawText(formatSampleDate(row.date), { x: COLUMN_X.date, y: started.y, size: ROW_FONT_SIZE, font })
  started.page.drawText(firstLine ?? row.description, {
    x: COLUMN_X.description,
    y: started.y,
    size: ROW_FONT_SIZE,
    font,
  })
  started.page.drawText(row.debitMinor === null ? '-' : formatMinor(row.debitMinor), {
    x: COLUMN_X.debit,
    y: started.y,
    size: ROW_FONT_SIZE,
    font,
  })
  started.page.drawText(row.creditMinor === null ? '-' : formatMinor(row.creditMinor), {
    x: COLUMN_X.credit,
    y: started.y,
    size: ROW_FONT_SIZE,
    font,
  })
  started.page.drawText(formatMinor(row.balanceMinor), {
    x: COLUMN_X.balance,
    y: started.y,
    size: ROW_FONT_SIZE,
    font,
  })

  let cursorAfterRow: Cursor = { page: started.page, y: started.y - LINE_HEIGHT }
  for (const line of continuationLines) {
    cursorAfterRow.page.drawText(line, {
      x: COLUMN_X.description,
      y: cursorAfterRow.y,
      size: ROW_FONT_SIZE,
      font,
    })
    cursorAfterRow = { page: cursorAfterRow.page, y: cursorAfterRow.y - LINE_HEIGHT }
  }
  return cursorAfterRow
}

function drawFooter(cursor: Cursor, font: PDFFont, transactions: readonly SampleTransaction[]): void {
  const totalDebitMinor = transactions.reduce((total, row) => total + (row.debitMinor ?? 0), 0)
  const totalCreditMinor = transactions.reduce((total, row) => total + (row.creditMinor ?? 0), 0)
  cursor.page.drawText(
    `Totals: Debit ${formatMinor(totalDebitMinor)} Credit ${formatMinor(totalCreditMinor)}`,
    { x: MARGIN, y: cursor.y, size: HEADER_FONT_SIZE, font },
  )
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const candidate = current === '' ? word : `${current} ${word}`
    if (current !== '' && font.widthOfTextAtSize(candidate, size) > maxWidth) {
      lines.push(current)
      current = word
    } else {
      current = candidate
    }
  }
  if (current !== '') lines.push(current)
  return lines.length === 0 ? [''] : lines
}
