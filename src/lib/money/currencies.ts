export interface CurrencyInfo {
  code: string;
  symbol: string;
  digits: number;
  /** Singular and plural names, used for speech and pickers. */
  name: readonly [singular: string, plural: string];
}

const entry = (
  code: string,
  symbol: string,
  digits: number,
  singular: string,
  plural: string,
): CurrencyInfo => ({ code, symbol, digits, name: [singular, plural] });

export const CURRENCIES: readonly CurrencyInfo[] = [
  entry('INR', '₹', 2, 'rupee', 'rupees'),
  entry('USD', '$', 2, 'US dollar', 'US dollars'),
  entry('EUR', '€', 2, 'euro', 'euros'),
  entry('GBP', '£', 2, 'pound', 'pounds'),
  entry('JPY', '¥', 0, 'yen', 'yen'),
  entry('CNY', 'CN¥', 2, 'yuan', 'yuan'),
  entry('AUD', 'A$', 2, 'Australian dollar', 'Australian dollars'),
  entry('CAD', 'CA$', 2, 'Canadian dollar', 'Canadian dollars'),
  entry('CHF', 'CHF', 2, 'Swiss franc', 'Swiss francs'),
  entry('SGD', 'S$', 2, 'Singapore dollar', 'Singapore dollars'),
  entry('HKD', 'HK$', 2, 'Hong Kong dollar', 'Hong Kong dollars'),
  entry('NZD', 'NZ$', 2, 'New Zealand dollar', 'New Zealand dollars'),
  entry('SEK', 'kr', 2, 'Swedish krona', 'Swedish kronor'),
  entry('NOK', 'kr', 2, 'Norwegian krone', 'Norwegian kroner'),
  entry('DKK', 'kr', 2, 'Danish krone', 'Danish kroner'),
  entry('KRW', '₩', 0, 'won', 'won'),
  entry('AED', 'AED', 2, 'dirham', 'dirhams'),
  entry('SAR', 'SAR', 2, 'riyal', 'riyals'),
  entry('ZAR', 'R', 2, 'rand', 'rand'),
  entry('BRL', 'R$', 2, 'real', 'reais'),
  entry('MXN', 'MX$', 2, 'Mexican peso', 'Mexican pesos'),
  entry('RUB', '₽', 2, 'ruble', 'rubles'),
  entry('TRY', '₺', 2, 'lira', 'lira'),
  entry('THB', '฿', 2, 'baht', 'baht'),
  entry('IDR', 'Rp', 2, 'rupiah', 'rupiah'),
  entry('MYR', 'RM', 2, 'ringgit', 'ringgit'),
  entry('PHP', '₱', 2, 'Philippine peso', 'Philippine pesos'),
  entry('PKR', 'Rs', 2, 'Pakistani rupee', 'Pakistani rupees'),
  entry('BDT', '৳', 2, 'taka', 'taka'),
  entry('LKR', 'Rs', 2, 'Sri Lankan rupee', 'Sri Lankan rupees'),
  entry('NPR', 'Rs', 2, 'Nepalese rupee', 'Nepalese rupees'),
  entry('VND', '₫', 0, 'dong', 'dong'),
  entry('EGP', 'E£', 2, 'Egyptian pound', 'Egyptian pounds'),
  entry('NGN', '₦', 2, 'naira', 'naira'),
  entry('KWD', 'KWD', 3, 'dinar', 'dinars'),
];

const BY_CODE: ReadonlyMap<string, CurrencyInfo> = new Map(CURRENCIES.map((c) => [c.code, c]));

const DEFAULT_DIGITS = 2;

export function normalizeCurrency(code: string): string {
  return code.trim().toUpperCase();
}

export function getCurrency(code: string): CurrencyInfo | undefined {
  return BY_CODE.get(normalizeCurrency(code));
}

export function minorDigits(code: string): number {
  return getCurrency(code)?.digits ?? DEFAULT_DIGITS;
}

export function currencySymbol(code: string): string {
  return getCurrency(code)?.symbol ?? normalizeCurrency(code);
}

export function currencyCodesWithDigits(digits: number): string[] {
  return CURRENCIES.filter((c) => c.digits === digits).map((c) => c.code);
}

export const DISTINCT_DIGITS: readonly number[] = [...new Set(CURRENCIES.map((c) => c.digits))];
