import type { CurrencyCode } from '../money'

interface SampleRow {
  date: string
  description: string
  amount: number
}

interface Pattern {
  description: string
  amount: number
  everyDays: number
  jitter: number
}

const CLIENTS: readonly Pattern[] = [
  { description: 'NORTHWIND STUDIO INVOICE', amount: 3200, everyDays: 34, jitter: 9 },
  { description: 'HELIOS LABS CONTRACT', amount: 1850, everyDays: 47, jitter: 12 },
  { description: 'PAYOUT PLATFORM SETTLEMENT', amount: 640, everyDays: 61, jitter: 15 },
]

const LIVING: readonly Pattern[] = [
  { description: 'CORNER MARKET', amount: -38, everyDays: 4, jitter: 2 },
  { description: 'RAIL TICKET', amount: -12, everyDays: 6, jitter: 3 },
  { description: 'CAFE ROSSO', amount: -6, everyDays: 3, jitter: 2 },
  { description: 'MOBILE PLAN', amount: -22, everyDays: 30, jitter: 1 },
  { description: 'CO-WORKING DESK', amount: -180, everyDays: 30, jitter: 2 },
  { description: 'DESIGN TOOLS SUBSCRIPTION', amount: -54, everyDays: 30, jitter: 1 },
  { description: 'PHARMACY', amount: -24, everyDays: 21, jitter: 7 },
  { description: 'RESTAURANT DINNER', amount: -48, everyDays: 11, jitter: 5 },
]

const OCCASIONAL: readonly SampleRow[] = [
  { date: '2025-11-14', description: 'LAPTOP REPLACEMENT', amount: -1840 },
  { date: '2026-01-09', description: 'ANNUAL INSURANCE', amount: -720 },
  { date: '2026-03-02', description: 'CONFERENCE TICKET', amount: -430 },
  { date: '2026-05-21', description: 'DENTIST', amount: -310 },
  { date: '2025-12-18', description: 'LOAN TO SAM RIVERA', amount: -2500 },
  { date: '2026-04-04', description: 'LOAN TO SAM RIVERA', amount: -900 },
  { date: '2026-06-27', description: 'REPAYMENT SAM RIVERA', amount: 1200 },
  { date: '2025-10-30', description: 'FAMILY SUPPORT MONTHLY', amount: -350 },
  { date: '2025-12-30', description: 'FAMILY SUPPORT MONTHLY', amount: -350 },
  { date: '2026-02-27', description: 'FAMILY SUPPORT MONTHLY', amount: -350 },
  { date: '2026-04-29', description: 'FAMILY SUPPORT MONTHLY', amount: -350 },
  { date: '2026-06-29', description: 'FAMILY SUPPORT MONTHLY', amount: -420 },
  { date: '2025-11-05', description: 'TRANSFER TO OWN SAVINGS', amount: -1500 },
  { date: '2026-02-06', description: 'TRANSFER TO OWN SAVINGS', amount: -2000 },
  { date: '2026-05-08', description: 'TRANSFER TO OWN SAVINGS', amount: -1200 },
  { date: '2026-03-19', description: 'ATM WITHDRAWAL', amount: -200 },
  { date: '2026-06-11', description: 'ATM WITHDRAWAL', amount: -150 },
]

const START = '2025-10-01'
const END = '2026-07-31'

function seeded(seed: number): () => number {
  let state = seed
  return () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let value = Math.imul(state ^ (state >>> 15), 1 | state)
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

function expand(patterns: readonly Pattern[], random: () => number): SampleRow[] {
  const rows: SampleRow[] = []
  for (const pattern of patterns) {
    let date = addDays(START, Math.floor(random() * pattern.everyDays))
    while (date <= END) {
      const drift = Math.round((random() - 0.5) * 2 * pattern.jitter)
      const variation = 1 + (random() - 0.5) * 0.4
      rows.push({
        date,
        description: pattern.description,
        amount: Math.round(pattern.amount * variation * 100) / 100,
      })
      date = addDays(date, Math.max(1, pattern.everyDays + drift))
    }
  }
  return rows
}

export function sampleRows(): SampleRow[] {
  const random = seeded(20260830)
  return [...expand(CLIENTS, random), ...expand(LIVING, random), ...OCCASIONAL].sort((left, right) =>
    left.date.localeCompare(right.date),
  )
}

export function sampleCsv(): string {
  const header = 'Date,Description,Amount,Balance'
  let balance = 2400
  const lines = sampleRows().map((row) => {
    balance = Math.round((balance + row.amount) * 100) / 100
    return `${row.date},"${row.description}",${row.amount.toFixed(2)},${balance.toFixed(2)}`
  })
  return [header, ...lines].join('\n')
}

export interface SampleSuggestion {
  match: string
  role: 'client' | 'account' | 'lent' | 'support' | 'spending'
}

export const sampleRoleSuggestions: readonly SampleSuggestion[] = [
  { match: 'INVOICE', role: 'client' },
  { match: 'CONTRACT', role: 'client' },
  { match: 'SETTLEMENT', role: 'client' },
  { match: 'OWN SAVINGS', role: 'account' },
  { match: 'SAM RIVERA', role: 'lent' },
  { match: 'FAMILY SUPPORT', role: 'support' },
]

export const sampleCurrency: CurrencyCode = 'EUR'
export const sampleLocale = 'en-IE'
