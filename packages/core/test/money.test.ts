import { describe, expect, it } from 'vitest'
import {
  CurrencyMismatchError,
  UnsupportedCurrencyError,
  add,
  currencyForRegion,
  formatCompact,
  formatMoney,
  formatSigned,
  fromMajor,
  fromMinor,
  isSupportedCurrency,
  parseAmount,
  sum,
  supportedCurrencies,
  toMajor,
  toSupportedCurrency,
} from '../src/money'

describe('money', () => {
  it('stores each supported currency in whole minor units', () => {
    expect(fromMajor(12.34, 'USD').minor).toBe(1234)
    expect(fromMajor(12.34, 'EUR').minor).toBe(1234)
    expect(fromMajor(12.34, 'INR').minor).toBe(1234)
  })

  it('accepts only the currencies the app supports', () => {
    expect(supportedCurrencies).toEqual(['USD', 'EUR', 'INR'])
    expect(isSupportedCurrency('gbp')).toBe(false)
    expect(toSupportedCurrency('inr')).toBe('INR')
    expect(() => toSupportedCurrency('JPY')).toThrow(UnsupportedCurrencyError)
  })

  it('picks a supported currency for a region', () => {
    expect(currencyForRegion('IN')).toBe('INR')
    expect(currencyForRegion('DE')).toBe('EUR')
    expect(currencyForRegion('GB')).toBe('USD')
  })

  it('refuses to combine different currencies', () => {
    expect(() => add(fromMajor(1, 'USD'), fromMajor(1, 'EUR'))).toThrow(CurrencyMismatchError)
  })

  it('adds without floating point drift', () => {
    const cents = Array.from({ length: 100 }, () => fromMajor(0.1, 'USD'))
    expect(toMajor(sum(cents, 'USD'))).toBe(10)
  })

  it('rejects fractional minor units', () => {
    expect(() => fromMinor(1.5, 'USD')).toThrow(RangeError)
  })

  describe('parseAmount', () => {
    it('reads plain and grouped numbers', () => {
      expect(parseAmount('1,234.56', 'USD').minor).toBe(123456)
      expect(parseAmount('$1,234.56', 'USD').minor).toBe(123456)
      expect(parseAmount('1 234,56', 'EUR').minor).toBe(123456)
      expect(parseAmount('1.234,56', 'EUR').minor).toBe(123456)
    })

    it('reads Indian grouping', () => {
      expect(parseAmount('12,69,536.00', 'INR').minor).toBe(126953600)
    })

    it('treats parentheses and minus signs as negative', () => {
      expect(parseAmount('(45.00)', 'USD').minor).toBe(-4500)
      expect(parseAmount('-45.00', 'USD').minor).toBe(-4500)
    })

    it('rejects text with no digits', () => {
      expect(() => parseAmount('n/a', 'USD')).toThrow(SyntaxError)
    })
  })

  describe('formatting', () => {
    it('uses the locale, never a hardcoded symbol', () => {
      expect(formatMoney(fromMajor(1234.5, 'USD'), { locale: 'en-US' })).toBe('$1,234.50')
      expect(formatMoney(fromMajor(1234.5, 'INR'), { locale: 'en-IN' })).toBe('₹1,234.50')
      expect(formatMoney(fromMajor(1234.5, 'EUR'), { locale: 'de-DE' })).toContain('1.234,50')
    })

    it('compacts using the locale conventions', () => {
      expect(formatCompact(fromMajor(1_200_000, 'INR'), { locale: 'en-IN' })).toContain('L')
      expect(formatCompact(fromMajor(1_200_000, 'USD'), { locale: 'en-US' })).toContain('M')
    })

    it('always shows an explicit sign so colour is never the only cue', () => {
      expect(formatSigned(fromMajor(-10, 'USD'), { locale: 'en-US' })).toBe('−$10.00')
      expect(formatSigned(fromMajor(10, 'USD'), { locale: 'en-US' })).toBe('+$10.00')
    })
  })
})
