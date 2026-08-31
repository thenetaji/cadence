export const supportedCurrencies = ['USD', 'EUR', 'INR'] as const

export type SupportedCurrency = (typeof supportedCurrencies)[number]

export const currencyNames: Readonly<Record<SupportedCurrency, string>> = {
  USD: 'US dollar',
  EUR: 'Euro',
  INR: 'Indian rupee',
}

export class UnsupportedCurrencyError extends Error {
  constructor(code: string) {
    super(`${code} is not supported yet. Cadence handles ${supportedCurrencies.join(', ')}.`)
    this.name = 'UnsupportedCurrencyError'
  }
}

export function isSupportedCurrency(code: string): code is SupportedCurrency {
  return supportedCurrencies.includes(code.toUpperCase() as SupportedCurrency)
}

export function toSupportedCurrency(code: string): SupportedCurrency {
  const upper = code.toUpperCase()
  if (!isSupportedCurrency(upper)) throw new UnsupportedCurrencyError(code)
  return upper
}

export function currencyForRegion(region: string): SupportedCurrency {
  if (region === 'IN') return 'INR'
  const euro = new Set([
    'AT', 'BE', 'CY', 'DE', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'IE', 'IT',
    'LT', 'LU', 'LV', 'MT', 'NL', 'PT', 'SI', 'SK',
  ])
  return euro.has(region) ? 'EUR' : 'USD'
}
