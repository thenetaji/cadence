import {
  UnrecognisedStatementError,
  isMappingComplete,
  parsePdfStatement,
  parseCsv,
  sampleBankParser,
  sampleCsv,
  suggestMapping,
  type ColumnMapping,
  type CsvTable,
} from '@cadence/core'
import { useState } from 'react'
import { UploadIcon } from '~/components/icons'
import { Button, Note } from '~/components/primitives'
import { Sheet } from '~/components/shell'
import { useWorkspace, type ImportOutcome } from '~/lib/workspace'

interface Loaded {
  table: CsvTable
  mapping: ColumnMapping
  fileName: string
}

const UNMAPPED = -1

export function ImportSheet({ onClose }: { onClose: () => void }) {
  const { workspace, importCsv, importStatement } = useWorkspace()
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [outcome, setOutcome] = useState<ImportOutcome | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const accept = (text: string, fileName: string) => {
    try {
      const table = parseCsv(text)
      if (table.rows.length === 0) {
        setProblem('That file has a header but no rows.')
        return
      }
      setProblem(null)
      setLoaded({ table, mapping: suggestMapping(table, workspace.locale), fileName })
    } catch {
      setProblem('That file could not be read as CSV.')
    }
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      accept(await file.text(), file.name)
      return
    }

    setBusy(true)
    try {
      const statement = await parsePdfStatement(
        await file.arrayBuffer(),
        workspace.displayCurrency,
        [sampleBankParser],
      )
      setProblem(null)
      setOutcome(importStatement(statement, file.name))
    } catch (error) {
      setProblem(
        error instanceof UnrecognisedStatementError
          ? 'No parser recognises this bank yet. Export a CSV from your bank instead, or add a parser — CONTRIBUTING.md explains how.'
          : 'That PDF could not be read.',
      )
    } finally {
      setBusy(false)
    }
  }

  if (outcome) {
    return (
      <Sheet title="Imported" onClose={onClose}>
        <p className="text-[13.5px] text-ink-2">
          Added {outcome.summary.added} transaction
          {outcome.summary.added === 1 ? '' : 's'}
          {outcome.summary.duplicates > 0
            ? `, skipped ${outcome.summary.duplicates} already imported`
            : ''}
          .
        </p>
        {outcome.summary.newCounterparties.length > 0 ? (
          <div className="mt-3">
            <Note>
              <strong className="text-ink">
                {outcome.summary.newCounterparties.length} new name
                {outcome.summary.newCounterparties.length === 1 ? '' : 's'}.
              </strong>{' '}
              Label them under People so the totals mean something.
            </Note>
          </div>
        ) : null}
        {outcome.skipped.length > 0 ? (
          <ul className="mt-3 max-h-32 overflow-y-auto text-[12px] text-ink-3">
            {outcome.skipped.slice(0, 20).map((entry) => (
              <li key={entry.row}>
                Row {entry.row}: {entry.reason}
              </li>
            ))}
          </ul>
        ) : null}
        <Button className="mt-4 w-full" onClick={onClose}>
          Done
        </Button>
      </Sheet>
    )
  }

  if (!loaded) {
    return (
      <Sheet
        title="Import a statement"
        description="Read on this device. The file is never uploaded."
        onClose={onClose}
      >
        <label className="block cursor-pointer rounded-[14px] border border-dashed border-border-strong bg-surface px-4 py-7 text-center">
          <input
            type="file"
            accept=".csv,.txt,.pdf,text/csv,application/pdf"
            className="sr-only"
            onChange={(event) => void onFile(event.target.files?.[0])}
          />
          <UploadIcon className="mx-auto h-6 w-6 text-ink-3" />
          <span className="mt-2.5 block text-[13.5px] font-semibold">
            {busy ? 'Reading…' : 'Choose a CSV or PDF file'}
          </span>
          <span className="mt-1 block text-[11.5px] text-ink-3">
            CSV works with any bank. PDF needs a parser for that bank.
          </span>
        </label>
        {problem ? <p className="mt-3 text-[12.5px] text-outflow">{problem}</p> : null}
        <Button
          variant="ghost"
          className="mt-3 w-full"
          onClick={() => accept(sampleCsv(), 'sample.csv')}
        >
          Use sample data instead
        </Button>
      </Sheet>
    )
  }

  const { table, mapping } = loaded
  const update = (patch: Partial<ColumnMapping>) =>
    setLoaded({ ...loaded, mapping: { ...mapping, ...patch } })

  return (
    <Sheet
      title="Check the columns"
      description={`${loaded.fileName} · ${table.rows.length} rows`}
      onClose={onClose}
    >
      <div className="flex flex-col gap-2.5">
        <ColumnPicker
          label="Date"
          table={table}
          value={mapping.date}
          onChange={(date) => update({ date })}
        />
        <ColumnPicker
          label="Description"
          table={table}
          value={mapping.description}
          onChange={(description) => update({ description })}
        />
        {mapping.amountShape === 'signed' ? (
          <ColumnPicker
            label="Amount"
            table={table}
            value={mapping.amount}
            onChange={(amount) => update({ amount })}
          />
        ) : (
          <>
            <ColumnPicker
              label="Money out"
              table={table}
              value={mapping.debit}
              onChange={(debit) => update({ debit })}
            />
            <ColumnPicker
              label="Money in"
              table={table}
              value={mapping.credit}
              onChange={(credit) => update({ credit })}
            />
          </>
        )}
        <ColumnPicker
          label="Balance"
          table={table}
          value={mapping.balance}
          onChange={(balance) => update({ balance })}
          optional
        />

        <label className="flex items-center justify-between rounded-[var(--radius-control)] border border-border px-3 py-2 text-[12.5px]">
          Dates read as
          <select
            value={mapping.dateOrder}
            onChange={(event) =>
              update({ dateOrder: event.target.value as ColumnMapping['dateOrder'] })
            }
            className="bg-transparent text-[12.5px] font-semibold outline-none"
          >
            <option value="dmy">Day first</option>
            <option value="mdy">Month first</option>
            <option value="ymd">Year first</option>
          </select>
        </label>
      </div>

      <Preview table={table} mapping={mapping} />

      <Button
        className="mt-4 w-full"
        disabled={!isMappingComplete(mapping)}
        onClick={() =>
          setOutcome(
            importCsv({
              table,
              mapping,
              institution: accountNameFrom(loaded.fileName),
              reference: String(table.rows.length),
              currency: workspace.displayCurrency,
            }),
          )
        }
      >
        Import {table.rows.length} rows
      </Button>
      <Button variant="ghost" className="mt-2 w-full" onClick={onClose}>
        Cancel
      </Button>
    </Sheet>
  )
}

function accountNameFrom(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim()
  return base === '' ? 'Imported account' : base.charAt(0).toUpperCase() + base.slice(1)
}

function ColumnPicker({
  label,
  table,
  value,
  onChange,
  optional,
}: {
  label: string
  table: CsvTable
  value: number
  onChange: (value: number) => void
  optional?: boolean
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-[var(--radius-control)] border border-border px-3 py-2 text-[12.5px]">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="min-w-0 max-w-[55%] truncate bg-transparent text-right text-[12.5px] font-semibold outline-none"
      >
        {optional ? <option value={UNMAPPED}>Not in this file</option> : null}
        {table.header.map((name, index) => (
          <option key={name} value={index}>
            {name}
          </option>
        ))}
      </select>
    </label>
  )
}

function Preview({ table, mapping }: { table: CsvTable; mapping: ColumnMapping }) {
  const rows = table.rows.slice(0, 3)
  return (
    <div className="mt-3 rounded-[var(--radius-control)] border border-border bg-surface-2 px-3 py-2">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-3">
        Preview
      </div>
      {rows.map((row, index) => (
        <div key={index} className="flex justify-between gap-3 py-0.5 text-[11.5px]">
          <span className="shrink-0 text-ink-3">{row[mapping.date]}</span>
          <span className="min-w-0 flex-1 truncate">{row[mapping.description]}</span>
          <span className="shrink-0 font-semibold">
            {mapping.amountShape === 'signed'
              ? row[mapping.amount]
              : (row[mapping.debit] ?? '') || (row[mapping.credit] ?? '')}
          </span>
        </div>
      ))}
    </div>
  )
}
