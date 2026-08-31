const CANDIDATE_DELIMITERS = [',', ';', '\t', '|'] as const

export type Delimiter = (typeof CANDIDATE_DELIMITERS)[number]

export interface CsvTable {
  header: string[]
  rows: string[][]
  delimiter: Delimiter
}

export function detectDelimiter(text: string): Delimiter {
  const sample = text.split(/\r?\n/).slice(0, 20).join('\n')
  let best: Delimiter = ','
  let bestScore = -1

  for (const delimiter of CANDIDATE_DELIMITERS) {
    const counts = sample
      .split(/\r?\n/)
      .filter((line) => line.trim() !== '')
      .map((line) => splitLine(line, delimiter).length)
    if (counts.length === 0) continue

    const columns = counts[0] ?? 0
    if (columns < 2) continue
    const consistent = counts.every((count) => count === columns)
    const score = consistent ? columns * 10 : columns
    if (score > bestScore) {
      bestScore = score
      best = delimiter
    }
  }
  return best
}

export function parseCsv(text: string, delimiter?: Delimiter): CsvTable {
  const resolved = delimiter ?? detectDelimiter(text)
  const withoutBom = text.replace(/^﻿/, '')
  const lines = splitRecords(withoutBom, resolved).filter((cells) =>
    cells.some((cell) => cell.trim() !== ''),
  )

  const header = lines.shift() ?? []
  const width = Math.max(header.length, ...lines.map((line) => line.length), 0)

  return {
    delimiter: resolved,
    header: pad(header, width).map((cell, index) => cell.trim() || `Column ${index + 1}`),
    rows: lines.map((line) => pad(line, width)),
  }
}

function pad(cells: string[], width: number): string[] {
  return cells.length === width ? cells : [...cells, ...Array<string>(width - cells.length).fill('')]
}

function splitRecords(text: string, delimiter: Delimiter): string[][] {
  const records: string[][] = []
  let cells: string[] = []
  let value = ''
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]

    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          value += '"'
          index += 1
        } else {
          quoted = false
        }
      } else {
        value += char
      }
      continue
    }

    if (char === '"') {
      quoted = true
    } else if (char === delimiter) {
      cells.push(value)
      value = ''
    } else if (char === '\n') {
      cells.push(value)
      records.push(cells)
      cells = []
      value = ''
    } else if (char !== '\r') {
      value += char
    }
  }

  if (value !== '' || cells.length > 0) {
    cells.push(value)
    records.push(cells)
  }
  return records
}

function splitLine(line: string, delimiter: Delimiter): string[] {
  return splitRecords(line, delimiter)[0] ?? []
}
