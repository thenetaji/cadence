export interface TextLine {
  page: number
  y: number
  x: number
  text: string
}

type PdfjsModule = typeof import('pdfjs-dist/legacy/build/pdf.mjs')
type PdfDocument = Awaited<ReturnType<PdfjsModule['getDocument']>['promise']>
type PdfPage = Awaited<ReturnType<PdfDocument['getPage']>>
type PdfTextContentItem = Awaited<ReturnType<PdfPage['getTextContent']>>['items'][number]
type PdfTextItem = Extract<PdfTextContentItem, { str: string }>

// pdf.js has no ambient DOM/Node globals available in this lib-free package;
// these are the two shapes the browser worker setup below actually touches.
declare const URL: { new (url: string, base: string): { toString(): string } }
declare global {
  interface ImportMeta {
    url: string
  }
}

let pdfjsModule: Promise<PdfjsModule> | null = null

function loadPdfjs(): Promise<PdfjsModule> {
  pdfjsModule ??= importPdfjs()
  return pdfjsModule
}

async function importPdfjs(): Promise<PdfjsModule> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  if (runningInBrowser()) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/legacy/build/pdf.worker.mjs',
      import.meta.url,
    ).toString()
  }
  return pdfjs
}

function runningInBrowser(): boolean {
  return 'window' in globalThis
}

export async function extractTextLines(source: ArrayBuffer): Promise<TextLine[]> {
  const pdfjs = await loadPdfjs()
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(source) })

  try {
    const document = await loadingTask.promise
    const lines: TextLine[] = []

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber)
      const content = await page.getTextContent()
      lines.push(...linesForPage(content.items.filter(isTextItem), pageNumber))
    }

    return lines
  } finally {
    await loadingTask.destroy()
  }
}

function isTextItem(item: PdfTextContentItem): item is PdfTextItem {
  return 'str' in item
}

function baselineY(item: PdfTextItem): number {
  return Number(item.transform[5])
}

function leftX(item: PdfTextItem): number {
  return Number(item.transform[4])
}

function fontHeight(item: PdfTextItem): number {
  return Math.abs(Number(item.transform[3]))
}

interface TextRow {
  y: number
  items: PdfTextItem[]
}

function linesForPage(items: readonly PdfTextItem[], page: number): TextLine[] {
  const rows = groupIntoRows(items)
  rows.sort((left, right) => right.y - left.y)

  const lines: TextLine[] = []
  for (const row of rows) {
    const ordered = [...row.items].sort((left, right) => leftX(left) - leftX(right))
    const first = ordered[0]
    if (first === undefined) continue

    const text = collapseWhitespace(joinRow(ordered))
    if (text === '') continue

    lines.push({ page, y: row.y, x: leftX(first), text })
  }
  return lines
}

// Baselines rarely land on the exact same y, and the amount of jitter scales
// with font size, so the clustering tolerance has to scale with it too.
function groupIntoRows(items: readonly PdfTextItem[]): TextRow[] {
  const sorted = [...items].sort((left, right) => baselineY(right) - baselineY(left))
  const rows: TextRow[] = []

  for (const item of sorted) {
    const y = baselineY(item)
    const tolerance = Math.max(2, fontHeight(item) * 0.5)
    const row = rows.find((candidate) => Math.abs(candidate.y - y) <= tolerance)
    if (row) {
      row.items.push(item)
    } else {
      rows.push({ y, items: [item] })
    }
  }
  return rows
}

// pdf.js splits runs mid-word, so joining every item with a space would
// corrupt words; a space is only real when there is a visible gap.
function joinRow(items: readonly PdfTextItem[]): string {
  let text = ''
  let previousEnd: number | null = null

  for (const item of items) {
    const x = leftX(item)
    if (previousEnd !== null && x - previousEnd > 1.2) {
      text += ' '
    }
    text += item.str
    previousEnd = x + item.width
  }
  return text
}

function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}
