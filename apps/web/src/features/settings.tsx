import { currencyNames, normaliseWorkspace, supportedCurrencies, toCsv, type Workspace } from '@cadence/core'
import { useState } from 'react'
import { Button, Note, Segmented } from '~/components/primitives'
import { Sheet } from '~/components/shell'
import { applyTheme, readThemeChoice, type ThemeChoice } from '~/lib/theme'
import { useWorkspace } from '~/lib/workspace'
import { AccountsSection } from './accounts'

const CURRENCIES = supportedCurrencies.map((code) => ({ value: code, label: code }))

const THEMES = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const satisfies readonly { value: ThemeChoice; label: string }[]

export function SettingsSheet({ onClose }: { onClose: () => void }) {
  const { workspace, replace, reset, setCurrency } = useWorkspace()
  const [theme, setTheme] = useState<ThemeChoice>(readThemeChoice)
  const [confirmingReset, setConfirmingReset] = useState(false)

  const download = (contents: string, type: string, extension: string) => {
    const blob = new Blob([contents], { type })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `cadence-${new Date().toISOString().slice(0, 10)}.${extension}`
    link.click()
    URL.revokeObjectURL(url)
  }

  const importFile = async (file: File | undefined) => {
    if (!file) return
    const parsed: unknown = JSON.parse(await file.text())
    if (isWorkspace(parsed)) replace(normaliseWorkspace(parsed))
  }

  return (
    <Sheet title="Settings" onClose={onClose}>
      <div className="mb-4">
        <div className="mb-1.5 text-[12px] font-semibold">Appearance</div>
        <Segmented
          options={THEMES}
          value={theme}
          onChange={(choice) => {
            setTheme(choice)
            applyTheme(choice)
          }}
        />
      </div>

      <div className="mb-4">
        <div className="mb-1.5 text-[12px] font-semibold">Currency</div>
        <Segmented options={CURRENCIES} value={workspace.displayCurrency} onChange={setCurrency} />
        <p className="mt-1.5 text-[12px] text-ink-3">
          {currencyNames[workspace.displayCurrency]}. Changing this relabels existing amounts; it
          does not convert them.
        </p>
      </div>

      <AccountsSection />

      <div className="mb-4">
        <div className="mb-1.5 text-[12px] font-semibold">Your data</div>
        <p className="mb-2.5 text-[12px] text-ink-3">
          Everything lives on this device. The backup restores into Cadence; the CSV is for a
          spreadsheet and does not come back in.
        </p>
        <Button
          variant="ghost"
          className="w-full"
          onClick={() =>
            download(JSON.stringify(workspace, null, 2), 'application/json', 'json')
          }
        >
          Export a backup
        </Button>
        <Button
          variant="ghost"
          className="mt-2 w-full"
          onClick={() => download(toCsv(workspace), 'text/csv', 'csv')}
        >
          Export transactions as CSV
        </Button>
        <label className="mt-2 block">
          <input
            type="file"
            accept="application/json"
            className="sr-only"
            onChange={(event) => void importFile(event.target.files?.[0])}
          />
          <span className="flex h-[38px] w-full cursor-pointer items-center justify-center rounded-[var(--radius-control)] border border-border-strong text-[13.5px] font-semibold">
            Restore from a backup
          </span>
        </label>
      </div>

      <div>
        <div className="mb-1.5 text-[12px] font-semibold">Start again</div>
        {confirmingReset ? (
          <>
            <Note>
              This deletes every transaction and label on this device. It cannot be undone.
            </Note>
            <div className="mt-2 flex gap-2">
              <Button
                className="flex-1"
                onClick={() => {
                  reset()
                  onClose()
                }}
              >
                Delete everything
              </Button>
              <Button variant="ghost" className="flex-1" onClick={() => setConfirmingReset(false)}>
                Keep it
              </Button>
            </div>
          </>
        ) : (
          <Button variant="ghost" className="w-full" onClick={() => setConfirmingReset(true)}>
            Delete all data
          </Button>
        )}
      </div>

      <p className="mt-5 text-[11px] text-ink-3">
        {workspace.transactions.length} transactions · {workspace.displayCurrency} ·{' '}
        {workspace.locale}
      </p>
    </Sheet>
  )
}

function isWorkspace(value: unknown): value is Workspace {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<Workspace>
  return (
    Array.isArray(candidate.transactions) &&
    Array.isArray(candidate.counterparties) &&
    Array.isArray(candidate.accounts) &&
    typeof candidate.displayCurrency === 'string'
  )
}
