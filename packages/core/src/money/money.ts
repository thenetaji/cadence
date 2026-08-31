import type { SupportedCurrency } from './currencies'

export type CurrencyCode = SupportedCurrency

export interface Money {
  readonly minor: number
  readonly currency: CurrencyCode
}

const EXPONENTS: Readonly<Record<CurrencyCode, number>> = {
  USD: 2,
  EUR: 2,
  INR: 2,
}

export class CurrencyMismatchError extends Error {
  constructor(left: CurrencyCode, right: CurrencyCode) {
    super(`Cannot combine ${left} with ${right}`)
    this.name = 'CurrencyMismatchError'
  }
}

export function exponentOf(currency: CurrencyCode): number {
  return EXPONENTS[currency]
}

function scaleOf(currency: CurrencyCode): number {
  return 10 ** exponentOf(currency)
}

export function fromMinor(minor: number, currency: CurrencyCode): Money {
  if (!Number.isSafeInteger(minor)) {
    throw new RangeError(`Money must be a whole number of minor units, received ${minor}`)
  }
  return { minor, currency }
}

export function fromMajor(major: number, currency: CurrencyCode): Money {
  return fromMinor(Math.round(major * scaleOf(currency)), currency)
}

export function zero(currency: CurrencyCode): Money {
  return fromMinor(0, currency)
}

export function toMajor(value: Money): number {
  return value.minor / scaleOf(value.currency)
}

function assertSameCurrency(left: Money, right: Money): void {
  if (left.currency !== right.currency) {
    throw new CurrencyMismatchError(left.currency, right.currency)
  }
}

export function add(left: Money, right: Money): Money {
  assertSameCurrency(left, right)
  return fromMinor(left.minor + right.minor, left.currency)
}

export function subtract(left: Money, right: Money): Money {
  assertSameCurrency(left, right)
  return fromMinor(left.minor - right.minor, left.currency)
}

export function negate(value: Money): Money {
  return fromMinor(-value.minor, value.currency)
}

export function absolute(value: Money): Money {
  return fromMinor(Math.abs(value.minor), value.currency)
}

export function sum(values: readonly Money[], currency: CurrencyCode): Money {
  return values.reduce((total, value) => add(total, value), zero(currency))
}

export function compare(left: Money, right: Money): number {
  assertSameCurrency(left, right)
  return left.minor - right.minor
}

export function isZero(value: Money): boolean {
  return value.minor === 0
}

export function isNegative(value: Money): boolean {
  return value.minor < 0
}

export function ratio(part: Money, whole: Money): number {
  assertSameCurrency(part, whole)
  return whole.minor === 0 ? 0 : part.minor / whole.minor
}

export function divideByCount(value: Money, count: number): Money {
  if (count <= 0) return zero(value.currency)
  return fromMinor(Math.round(value.minor / count), value.currency)
}

const SEPARATORS = /[\s  ']/g

export function parseAmount(text: string, currency: CurrencyCode): Money {
  const stripped = text.replace(SEPARATORS, '')
  const negative = /^\(.*\)$/.test(stripped) || stripped.includes('-')
  const digits = stripped.replace(/[^\d.,]/g, '')
  if (digits === '') throw new SyntaxError(`Cannot read an amount from ${JSON.stringify(text)}`)

  const normalised = normaliseDecimalSeparator(digits)
  const value = Number(normalised)
  if (!Number.isFinite(value)) {
    throw new SyntaxError(`Cannot read an amount from ${JSON.stringify(text)}`)
  }
  return fromMajor(negative ? -value : value, currency)
}

function normaliseDecimalSeparator(digits: string): string {
  const lastComma = digits.lastIndexOf(',')
  const lastDot = digits.lastIndexOf('.')

  if (lastComma === -1 && lastDot === -1) return digits
  if (lastComma > lastDot) {
    return digits.replace(/\./g, '').replace(',', '.')
  }
  return digits.replace(/,/g, '')
}
