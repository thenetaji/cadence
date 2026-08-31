import type { IsoDate } from '../model'

export type DateOrder = 'dmy' | 'mdy' | 'ymd'

const MONTH_NAMES = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
]

const NUMERIC = /^(\d{1,4})[-/. ](\d{1,2})[-/. ](\d{1,4})$/
const WITH_MONTH_NAME = /^(\d{1,2})[-/. ]([A-Za-z]{3,})[-/. ](\d{2,4})$/
const MONTH_NAME_FIRST = /^([A-Za-z]{3,})[-/. ](\d{1,2}),?[-/. ]*(\d{2,4})$/

export function parseDate(text: string, order: DateOrder): IsoDate | null {
  const trimmed = text.trim()
  if (trimmed === '') return null

  const named = WITH_MONTH_NAME.exec(trimmed)
  if (named) {
    return build(Number(named[3]), monthFromName(named[2] ?? ''), Number(named[1]))
  }

  const namedFirst = MONTH_NAME_FIRST.exec(trimmed)
  if (namedFirst) {
    return build(Number(namedFirst[3]), monthFromName(namedFirst[1] ?? ''), Number(namedFirst[2]))
  }

  const numeric = NUMERIC.exec(trimmed)
  if (!numeric) return null

  const first = Number(numeric[1])
  const second = Number(numeric[2])
  const third = Number(numeric[3])

  if ((numeric[1] ?? '').length === 4) return build(first, second, third)
  if (order === 'ymd') return build(first, second, third)
  if (order === 'mdy') return build(third, first, second)
  return build(third, second, first)
}

function monthFromName(name: string): number {
  const index = MONTH_NAMES.indexOf(name.slice(0, 3).toLowerCase())
  return index === -1 ? Number.NaN : index + 1
}

function build(year: number, month: number, day: number): IsoDate | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null
  const fullYear = year < 100 ? 2000 + year : year
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const date = new Date(Date.UTC(fullYear, month - 1, day))
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null
  return date.toISOString().slice(0, 10)
}

export function localeDateOrder(locale: string): DateOrder {
  const parts = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  }).formatToParts(new Date(Date.UTC(2026, 0, 2)))

  for (const part of parts) {
    if (part.type === 'year') return 'ymd'
    if (part.type === 'month') return 'mdy'
    if (part.type === 'day') return 'dmy'
  }
  return 'dmy'
}

export function detectDateOrder(samples: readonly string[], locale = 'en-US'): DateOrder {
  let sawDayFirst = false
  let sawMonthFirst = false

  for (const sample of samples) {
    const numeric = NUMERIC.exec(sample.trim())
    if (!numeric) continue
    if ((numeric[1] ?? '').length === 4) return 'ymd'
    if (Number(numeric[1]) > 12) sawDayFirst = true
    if (Number(numeric[2]) > 12) sawMonthFirst = true
  }

  if (sawDayFirst && !sawMonthFirst) return 'dmy'
  if (sawMonthFirst && !sawDayFirst) return 'mdy'
  return localeDateOrder(locale)
}

export function formatDate(date: IsoDate, locale: string, style: 'short' | 'medium'): string {
  const [year, month, day] = date.split('-').map(Number)
  if (year === undefined || month === undefined || day === undefined) return date
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: style === 'short' ? 'short' : 'long',
    year: style === 'short' ? undefined : 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

export function monthKey(date: IsoDate): string {
  return date.slice(0, 7)
}

export function daysBetween(from: IsoDate, to: IsoDate): number {
  const start = Date.parse(`${from}T00:00:00Z`)
  const end = Date.parse(`${to}T00:00:00Z`)
  return Math.round((end - start) / 86_400_000)
}
