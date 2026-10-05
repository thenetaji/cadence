export interface NumberLocale {
  group: string;
  decimal: string;
  /** 'indian' groups 3 then 2 (1,23,456); 'western' groups by 3. */
  style: 'western' | 'indian';
  symbol: 'prefix' | 'suffix';
  /** Space between symbol and number when the symbol is a prefix. */
  symbolSpace: boolean;
}

const NBSP = '\u00a0';
const NNBSP = '\u202f';

const western: NumberLocale = { group: ',', decimal: '.', style: 'western', symbol: 'prefix', symbolSpace: false };
const indian: NumberLocale = { ...western, style: 'indian' };
const european: NumberLocale = { group: '.', decimal: ',', style: 'western', symbol: 'suffix', symbolSpace: true };

const TABLE: Readonly<Record<string, NumberLocale>> = {
  en: western,
  'en-IN': indian,
  hi: indian,
  ja: western,
  zh: western,
  ko: western,
  de: european,
  es: european,
  'es-MX': western,
  it: european,
  nl: { ...european, symbol: 'prefix' },
  pt: { ...european, symbol: 'prefix' },
  'pt-PT': { ...european, group: NBSP },
  fr: { ...european, group: NNBSP },
  ru: { ...european, group: NBSP },
  sv: { ...european, group: NBSP },
  pl: { ...european, group: NBSP },
  tr: { ...european, symbol: 'prefix', symbolSpace: false },
};

const FALLBACK = western;

function fromIntl(tag: string): NumberLocale | undefined {
  try {
    const sample = new Intl.NumberFormat(tag).format(1234567.89);
    const match = /^1(\D?)234\D?567(\D)89$/.exec(sample);
    if (!match) return undefined;
    return { ...western, group: match[1] ?? '', decimal: match[2] ?? '.' };
  } catch {
    return undefined;
  }
}

export function resolveNumberLocale(tag: string | undefined): NumberLocale {
  if (!tag) return FALLBACK;
  const normalized = tag.replace('_', '-');
  const [language = '', ...rest] = normalized.split('-');
  const region = rest.find((part) => /^[A-Za-z]{2}$/.test(part))?.toUpperCase();
  const exact = region ? TABLE[`${language.toLowerCase()}-${region}`] : undefined;
  if (exact) return exact;
  const byLanguage = TABLE[language.toLowerCase()];
  if (byLanguage) return region === 'IN' ? { ...byLanguage, style: 'indian' } : byLanguage;
  const hinted = fromIntl(normalized);
  if (hinted) return region === 'IN' ? { ...hinted, style: 'indian' } : hinted;
  return region === 'IN' ? indian : FALLBACK;
}

export function groupInteger(digits: string, locale: NumberLocale): string {
  if (digits.length <= 3) return digits;
  const tail = digits.slice(-3);
  let head = digits.slice(0, -3);
  const size = locale.style === 'indian' ? 2 : 3;
  const parts: string[] = [];
  while (head.length > size) {
    parts.unshift(head.slice(-size));
    head = head.slice(0, -size);
  }
  parts.unshift(head);
  return `${parts.join(locale.group)}${locale.group}${tail}`;
}
