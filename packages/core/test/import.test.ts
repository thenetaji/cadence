import { describe, expect, it } from 'vitest'
import {
  buildStatement,
  detectDateOrder,
  detectDelimiter,
  isMappingComplete,
  parseCsv,
  parseDate,
  suggestMapping,
} from '../src/import'

const UK_STYLE = `Date,Description,Paid Out,Paid In,Balance
02/04/2026,"TESCO STORES 3421",42.10,,1450.22
05/04/2026,"ACME LTD INVOICE 118",,2400.00,3850.22
06/04/2026,"Transfer to Savings",500.00,,3350.22
`

const US_STYLE = `Transaction Date,Memo,Amount
04/02/2026,WHOLE FOODS MKT,-42.10
04/05/2026,CLIENT WIRE,2400.00
04/06/2026,ATM WITHDRAWAL,-100.00
`

const EU_STYLE = `Buchungstag;Verwendungszweck;Betrag
02.04.2026;REWE MARKT;-42,10
05.04.2026;HONORAR RECHNUNG 118;2.400,00
`

describe('detectDelimiter', () => {
  it('finds commas, semicolons and tabs', () => {
    expect(detectDelimiter(UK_STYLE)).toBe(',')
    expect(detectDelimiter(EU_STYLE)).toBe(';')
    expect(detectDelimiter('a\tb\tc\n1\t2\t3\n')).toBe('\t')
  })
})

describe('parseCsv', () => {
  it('keeps quoted commas inside one cell', () => {
    const table = parseCsv('Date,Description\n01/01/2026,"Coffee, milk and a bun"\n')
    expect(table.rows[0]?.[1]).toBe('Coffee, milk and a bun')
  })

  it('unescapes doubled quotes', () => {
    const table = parseCsv('a,b\n1,"He said ""hello"""\n')
    expect(table.rows[0]?.[1]).toBe('He said "hello"')
  })

  it('names blank headers rather than leaving them empty', () => {
    const table = parseCsv('Date,,Amount\n01/01/2026,x,5\n')
    expect(table.header[1]).toBe('Column 2')
  })
})

describe('parseDate', () => {
  it('respects the detected order', () => {
    expect(parseDate('02/04/2026', 'dmy')).toBe('2026-04-02')
    expect(parseDate('02/04/2026', 'mdy')).toBe('2026-02-04')
    expect(parseDate('2026-04-02', 'ymd')).toBe('2026-04-02')
  })

  it('reads month names in either position', () => {
    expect(parseDate('02 Apr 2026', 'dmy')).toBe('2026-04-02')
    expect(parseDate('Apr 2, 2026', 'mdy')).toBe('2026-04-02')
  })

  it('rejects impossible dates', () => {
    expect(parseDate('31/02/2026', 'dmy')).toBeNull()
    expect(parseDate('not a date', 'dmy')).toBeNull()
  })

  it('infers order from a day greater than twelve', () => {
    expect(detectDateOrder(['02/04/2026', '25/04/2026'])).toBe('dmy')
    expect(detectDateOrder(['04/02/2026', '04/25/2026'])).toBe('mdy')
    expect(detectDateOrder(['2026-04-02'])).toBe('ymd')
  })

  it('falls back to the locale when every sample is ambiguous', () => {
    expect(detectDateOrder(['04/02/2026'], 'en-US')).toBe('mdy')
    expect(detectDateOrder(['04/02/2026'], 'en-GB')).toBe('dmy')
    expect(detectDateOrder(['04/02/2026'], 'en-IN')).toBe('dmy')
  })
})

describe('suggestMapping', () => {
  it('recognises split debit and credit columns', () => {
    const mapping = suggestMapping(parseCsv(UK_STYLE), 'en-GB')
    expect(mapping.amountShape).toBe('split')
    expect(mapping.dateOrder).toBe('dmy')
    expect(isMappingComplete(mapping)).toBe(true)
  })

  it('recognises a single signed amount column', () => {
    const mapping = suggestMapping(parseCsv(US_STYLE), 'en-US')
    expect(mapping.amountShape).toBe('signed')
    expect(mapping.dateOrder).toBe('mdy')
    expect(isMappingComplete(mapping)).toBe(true)
  })

  it('handles non-English headers by falling back to content', () => {
    const mapping = suggestMapping(parseCsv(EU_STYLE), 'de-DE')
    expect(isMappingComplete(mapping)).toBe(true)
  })
})

describe('buildStatement', () => {
  const options = { institution: 'Test Bank', reference: '0001', currency: 'EUR' } as const

  it('turns split columns into signed transactions', () => {
    const table = parseCsv(UK_STYLE)
    const { statement, skipped } = buildStatement(table, suggestMapping(table, 'en-GB'), options)

    expect(skipped).toHaveLength(0)
    expect(statement.transactions).toHaveLength(3)
    expect(statement.transactions[0]).toMatchObject({
      date: '2026-04-02',
      direction: 'out',
      reference: '',
    })
    expect(statement.transactions[0]?.amount.minor).toBe(4210)
    expect(statement.transactions[1]?.direction).toBe('in')
  })

  it('reads a signed amount column and detects channels', () => {
    const table = parseCsv(US_STYLE)
    const { statement } = buildStatement(table, suggestMapping(table, 'en-US'), {
      ...options,
      currency: 'USD',
    })

    expect(statement.transactions.map((entry) => entry.direction)).toEqual(['out', 'in', 'out'])
    expect(statement.transactions.at(-1)?.channel).toBe('atm')
  })

  it('reads European decimal commas', () => {
    const table = parseCsv(EU_STYLE)
    const { statement } = buildStatement(table, suggestMapping(table, 'de-DE'), {
      ...options,
      currency: 'EUR',
    })

    expect(statement.transactions[0]?.amount.minor).toBe(4210)
    expect(statement.transactions[1]?.amount.minor).toBe(240000)
  })

  it('reports unreadable rows instead of dropping them silently', () => {
    const table = parseCsv('Date,Description,Amount\nrubbish,Coffee,-4.00\n01/05/2026,Tea,-2.00\n')
    const { statement, skipped } = buildStatement(table, suggestMapping(table), options)

    expect(statement.transactions).toHaveLength(1)
    expect(skipped).toEqual([{ row: 2, reason: 'Unreadable date "rubbish"' }])
  })

  it('sorts output by date regardless of file order', () => {
    const table = parseCsv('Date,Description,Amount\n05/05/2026,B,-1.00\n01/05/2026,A,-2.00\n')
    const { statement } = buildStatement(table, suggestMapping(table, 'en-GB'), options)

    expect(statement.transactions.map((entry) => entry.date)).toEqual(['2026-05-01', '2026-05-05'])
  })
})
