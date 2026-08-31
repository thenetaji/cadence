import { parseAmount, toMajor, type Account } from '@cadence/core'
import { useMemo, useState } from 'react'
import { Amount, Button, ListRow, Note } from '~/components/primitives'
import { useWorkspace } from '~/lib/workspace'

type RowState = 'closed' | 'editing' | 'confirming-removal'

export function AccountsSection() {
  const { workspace } = useWorkspace()
  const [openAccountId, setOpenAccountId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  const transactionCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const entry of workspace.transactions) {
      counts.set(entry.accountId, (counts.get(entry.accountId) ?? 0) + 1)
    }
    return counts
  }, [workspace.transactions])

  return (
    <div className="mb-4">
      <div className="mb-1.5 text-[12px] font-semibold">Accounts</div>

      {workspace.accounts.length === 0 ? (
        <p className="mb-2 text-[12px] text-ink-3">Nothing added yet.</p>
      ) : (
        workspace.accounts.map((account) => (
          <AccountRow
            key={account.id}
            account={account}
            transactionCount={transactionCounts.get(account.id) ?? 0}
            open={openAccountId === account.id}
            onOpen={() => setOpenAccountId(account.id)}
            onClose={() => setOpenAccountId(null)}
          />
        ))
      )}

      {adding ? (
        <AddAccountForm onDone={() => setAdding(false)} />
      ) : (
        <Button variant="ghost" className="mt-2 w-full" onClick={() => setAdding(true)}>
          Add an account
        </Button>
      )}

      <p className="mt-1.5 text-[12px] text-ink-3">
        Use this for cash, or an account with no statement to import.
      </p>
    </div>
  )
}

function AccountRow({
  account,
  transactionCount,
  open,
  onOpen,
  onClose,
}: {
  account: Account
  transactionCount: number
  open: boolean
  onOpen: () => void
  onClose: () => void
}) {
  const { money, renameAccount, setAccountBalance, removeAccount, workspace } = useWorkspace()
  const [state, setState] = useState<RowState>('closed')
  const [label, setLabel] = useState(account.label)
  const [balanceText, setBalanceText] = useState(String(toMajor(account.closingBalance)))
  const [problem, setProblem] = useState<string | null>(null)

  if (!open) {
    return (
      <ListRow
        title={account.label}
        subtitle={describe(account, transactionCount)}
        trailing={<Amount text={money(account.closingBalance)} tone="flat" />}
        onClick={() => {
          setLabel(account.label)
          setBalanceText(String(toMajor(account.closingBalance)))
          setProblem(null)
          setState('editing')
          onOpen()
        }}
      />
    )
  }

  const dismiss = () => {
    setState('closed')
    onClose()
  }

  const save = () => {
    const trimmed = label.trim()
    if (trimmed === '') {
      setProblem('Give the account a name.')
      return
    }

    if (account.source === 'manual') {
      try {
        setAccountBalance(account.id, parseAmount(balanceText, workspace.displayCurrency))
      } catch {
        setProblem('That balance could not be read.')
        return
      }
    }

    if (trimmed !== account.label) renameAccount(account.id, trimmed)
    dismiss()
  }

  if (state === 'confirming-removal') {
    return (
      <div className="my-2 rounded-[var(--radius-card)] border border-border p-3">
        <Note>
          This removes {account.label} and its {transactionCount} transaction
          {transactionCount === 1 ? '' : 's'}. It cannot be undone.
        </Note>
        <div className="mt-2 flex gap-2">
          <Button
            className="flex-1"
            onClick={() => {
              removeAccount(account.id)
              dismiss()
            }}
          >
            Remove
          </Button>
          <Button variant="ghost" className="flex-1" onClick={() => setState('editing')}>
            Keep it
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="my-2 rounded-[var(--radius-card)] border border-border p-3">
      <Field label="Name">
        <input
          type="text"
          value={label}
          onChange={(event) => {
            setLabel(event.target.value)
            setProblem(null)
          }}
          className="w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-[13px] outline-none"
        />
      </Field>

      {account.source === 'manual' ? (
        <Field label="Balance">
          <input
            type="text"
            inputMode="decimal"
            value={balanceText}
            onChange={(event) => {
              setBalanceText(event.target.value)
              setProblem(null)
            }}
            className="w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-[13px] outline-none"
          />
        </Field>
      ) : (
        <p className="mb-2 text-[12px] text-ink-3">
          The balance comes from imported statements and cannot be typed over.
        </p>
      )}

      {problem ? <p className="mb-2 text-[12.5px] text-outflow">{problem}</p> : null}

      <div className="flex gap-2">
        <Button className="flex-1" onClick={save}>
          Save
        </Button>
        <Button variant="ghost" className="flex-1" onClick={dismiss}>
          Cancel
        </Button>
      </div>
      <Button
        variant="ghost"
        className="mt-2 w-full"
        onClick={() => setState('confirming-removal')}
      >
        Remove this account
      </Button>
    </div>
  )
}

function AddAccountForm({ onDone }: { onDone: () => void }) {
  const { addAccount, workspace } = useWorkspace()
  const [name, setName] = useState('')
  const [balanceText, setBalanceText] = useState('')
  const [problem, setProblem] = useState<string | null>(null)

  const submit = () => {
    const trimmed = name.trim()
    if (trimmed === '') {
      setProblem('Give the account a name.')
      return
    }

    try {
      addAccount(trimmed, parseAmount(balanceText || '0', workspace.displayCurrency))
      onDone()
    } catch (error) {
      setProblem(
        error instanceof SyntaxError
          ? 'That balance could not be read.'
          : 'An account with that name already exists.',
      )
    }
  }

  return (
    <div className="mt-2.5 rounded-[var(--radius-card)] border border-border p-3">
      <Field label="Name">
        <input
          type="text"
          value={name}
          onChange={(event) => {
            setName(event.target.value)
            setProblem(null)
          }}
          placeholder="Cash"
          className="w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-[13px] outline-none"
        />
      </Field>
      <Field label="Starting balance">
        <input
          type="text"
          inputMode="decimal"
          value={balanceText}
          onChange={(event) => {
            setBalanceText(event.target.value)
            setProblem(null)
          }}
          placeholder="0.00"
          className="w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-[13px] outline-none"
        />
      </Field>
      {problem ? <p className="mb-2 text-[12.5px] text-outflow">{problem}</p> : null}
      <div className="flex gap-2">
        <Button className="flex-1" onClick={submit}>
          Add account
        </Button>
        <Button variant="ghost" className="flex-1" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

function describe(account: Account, transactionCount: number): string {
  const counted = `${transactionCount} transaction${transactionCount === 1 ? '' : 's'}`
  if (account.source === 'manual') return 'Typed in by you'
  return account.institution === account.label
    ? counted
    : `${account.institution} · ${counted}`
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mb-2 block">
      <span className="mb-1 block text-[11px] text-ink-3">{label}</span>
      {children}
    </label>
  )
}
