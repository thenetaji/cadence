import { currencySymbol, minorDigits, normalizeCurrency } from './currencies';
import { resolveNumberLocale } from './locales';

const MAX_SAFE_MINOR = Number.MAX_SAFE_INTEGER;

/**
 * Parses user text such as "1,23,456.50" or "1.234,56" into integer minor units
 * without ever producing an intermediate float. Returns null when the text is
 * not a plain number.
 */
export function parseAmountText(text: string, currency: string, locale?: string): number | null {
  const digits = minorDigits(currency);
  const symbol = currencySymbol(normalizeCurrency(currency));
  let cleaned = text.replace(symbol, '').replace(/[\s  ]/g, '').replace(/[−–]/g, '-');
  let negative = false;
  if (cleaned.startsWith('-')) {
    negative = true;
    cleaned = cleaned.slice(1);
  } else if (cleaned.startsWith('+')) {
    cleaned = cleaned.slice(1);
  }
  if (!/^[\d.,]+$/.test(cleaned) || !/\d/.test(cleaned)) return null;

  const preferred = resolveNumberLocale(locale);
  const lastDot = cleaned.lastIndexOf('.');
  const lastComma = cleaned.lastIndexOf(',');
  let decimalChar: string | null = null;
  if (lastDot >= 0 && lastComma >= 0) {
    decimalChar = lastDot > lastComma ? '.' : ',';
  } else if (lastDot >= 0 || lastComma >= 0) {
    const char = lastDot >= 0 ? '.' : ',';
    const occurrences = cleaned.split(char).length - 1;
    const tail = cleaned.length - cleaned.lastIndexOf(char) - 1;
    if (occurrences === 1 && (tail !== 3 || char === preferred.decimal)) decimalChar = char;
  }

  const groupChar = decimalChar === '.' ? ',' : '.';
  const normalized = decimalChar === null ? cleaned.split(',').join('').split('.').join('') : cleaned;
  const [rawInt = '', rawFrac = ''] =
    decimalChar === null ? [normalized, ''] : splitOnce(normalized, decimalChar, groupChar);
  if (!/^\d*$/.test(rawInt) || !/^\d*$/.test(rawFrac)) return null;
  if (rawInt === '' && rawFrac === '') return null;

  const frac = rawFrac.padEnd(digits, '0');
  let minor = Number(`${rawInt || '0'}${frac.slice(0, digits)}`);
  if (frac.length > digits && Number(frac[digits]) >= 5) minor += 1;
  if (!Number.isSafeInteger(minor) || minor > MAX_SAFE_MINOR) return null;
  return negative ? -minor : minor;
}

function splitOnce(value: string, decimal: string, group: string): [string, string] {
  const index = value.lastIndexOf(decimal);
  const integer = value.slice(0, index).split(group).join('');
  return [integer, value.slice(index + 1)];
}

/** Canonical decimal string ("12.50") with '.' as separator, safe for storage or CSV. */
export function fromMinor(minor: number, currency: string): string {
  const digits = minorDigits(currency);
  const abs = Math.abs(Math.trunc(minor));
  const sign = minor < 0 ? '-' : '';
  if (digits === 0) return `${sign}${abs}`;
  const padded = String(abs).padStart(digits + 1, '0');
  return `${sign}${padded.slice(0, -digits)}.${padded.slice(-digits)}`;
}

/** Inverse of fromMinor for canonical or user text; null when unparseable. */
export function toMinor(text: string, currency: string): number | null {
  return parseAmountText(text, currency, 'en-US');
}
