import { absolute, exponentOf, isNegative, toMajor, type CurrencyCode, type Money } from './money'

export interface FormatOptions {
  locale?: string
  currencyDisplay?: 'symbol' | 'narrowSymbol' | 'code' | 'none'
}

const formatters = new Map<string, Intl.NumberFormat>()

function formatter(key: string, build: () => Intl.NumberFormat): Intl.NumberFormat {
  const existing = formatters.get(key)
  if (existing) return existing
  const created = build()
  formatters.set(key, created)
  return created
}

function resolve(options: FormatOptions | undefined): Required<FormatOptions> {
  return {
    locale: options?.locale ?? 'en-US',
    currencyDisplay: options?.currencyDisplay ?? 'narrowSymbol',
  }
}

function currencyOptions(
  currency: CurrencyCode,
  display: Required<FormatOptions>['currencyDisplay'],
): Intl.NumberFormatOptions {
  const digits = exponentOf(currency)
  if (display === 'none') {
    return { minimumFractionDigits: digits, maximumFractionDigits: digits }
  }
  return {
    style: 'currency',
    currency,
    currencyDisplay: display,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }
}

export function formatMoney(value: Money, options?: FormatOptions): string {
  const { locale, currencyDisplay } = resolve(options)
  return formatter(`exact:${locale}:${value.currency}:${currencyDisplay}`, () =>
    new Intl.NumberFormat(locale, currencyOptions(value.currency, currencyDisplay)),
  ).format(toMajor(value))
}

export function formatWhole(value: Money, options?: FormatOptions): string {
  const { locale, currencyDisplay } = resolve(options)
  return formatter(`whole:${locale}:${value.currency}:${currencyDisplay}`, () =>
    new Intl.NumberFormat(locale, {
      ...currencyOptions(value.currency, currencyDisplay),
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }),
  ).format(toMajor(value))
}

export function formatCompact(value: Money, options?: FormatOptions): string {
  const { locale, currencyDisplay } = resolve(options)
  const text = formatter(`compact:${locale}:${value.currency}:${currencyDisplay}`, () =>
    new Intl.NumberFormat(locale, {
      ...currencyOptions(value.currency, currencyDisplay),
      notation: 'compact',
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }),
  ).format(toMajor(absolute(value)))
  return isNegative(value) ? `−${text}` : text
}

export function formatSigned(value: Money, options?: FormatOptions): string {
  const magnitude = formatMoney(absolute(value), options)
  return `${isNegative(value) ? '−' : '+'}${magnitude}`
}

export function formatPercent(value: number, options?: FormatOptions): string {
  const { locale } = resolve(options)
  return formatter(`percent:${locale}`, () =>
    new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 }),
  ).format(value)
}
