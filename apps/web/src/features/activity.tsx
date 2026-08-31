import { fromMinor, monthKey, type Transaction } from '@cadence/core'
import { useMemo, useState } from 'react'
import { PlusIcon } from '~/components/icons'
import { Select } from '~/components/form'
import { Amount, Chip, Initials, ListRow, Segmented } from '~/components/primitives'
import { IconButton, PageHeader } from '~/components/shell'
import { useRouter } from '~/lib/router'
import { useWorkspace } from '~/lib/workspace'
import { EntrySheet } from './entry'
import { monthLabel } from './overview'

type Filter = 'all' | 'in' | 'out' | 'moves'

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'in', label: 'In' },
  { value: 'out', label: 'Out' },
  { value: 'moves', label: 'Moves' },
] as const

const ANY = 'any'

export function ActivityPage() {
  const { workspace, money, moneyWhole, fullDay, counterparty, account, undo, canUndo } =
    useWorkspace()
  const { navigate } = useRouter()
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [accountId, setAccountId] = useState(ANY)
  const [month, setMonth] = useState(ANY)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)

  const months = useMemo(() => {
    const found = new Set(workspace.transactions.map((entry) => monthKey(entry.date)))
    return [...found].sort().reverse()
  }, [workspace.transactions])

  const visible = useMemo(() => {
    const search = query.trim().toLowerCase()
    return workspace.transactions
      .filter((entry) => {
        const party = counterparty(entry.counterpartyId)
        const isMove = party?.role === 'account'
        if (filter === 'in' && (entry.direction !== 'in' || isMove)) return false
        if (filter === 'out' && (entry.direction !== 'out' || isMove)) return false
        if (filter === 'moves' && !isMove) return false
        if (accountId !== ANY && entry.accountId !== accountId) return false
        if (month !== ANY && monthKey(entry.date) !== month) return false
        if (search === '') return true
        return `${party?.displayName ?? ''} ${entry.description} ${entry.note}`
          .toLowerCase()
          .includes(search)
      })
      .slice()
      .reverse()
  }, [workspace.transactions, filter, query, accountId, month, counterparty])

  const totals = useMemo(() => {
    let inflow = 0
    let outflow = 0
    for (const entry of visible) {
      if (counterparty(entry.counterpartyId)?.role === 'account') continue
      if (entry.direction === 'in') inflow += entry.amount.minor
      else outflow += entry.amount.minor
    }
    return { inflow, outflow }
  }, [visible, counterparty])

  const groups = useMemo(() => groupByDay(visible), [visible])
  const manyAccounts = workspace.accounts.length > 1

  if (workspace.transactions.length === 0) {
    return (
      <>
        <PageHeader
          title="Activity"
          subtitle="Nothing recorded yet"
          actions={
            <IconButton label="Add an entry" onClick={() => setAdding(true)}>
              <PlusIcon className="h-[15px] w-[15px]" />
            </IconButton>
          }
        />
        <p className="py-12 text-center text-[13px] text-ink-3">
          Add an entry by hand, or import a statement from the Overview screen.
        </p>
        {adding ? <EntrySheet onClose={() => setAdding(false)} /> : null}
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Activity"
        subtitle={`${visible.length} of ${workspace.transactions.length}`}
        actions={
          <>
            {canUndo ? (
              <button
                type="button"
                onClick={undo}
                className="h-[30px] rounded-[var(--radius-control)] border border-border bg-surface px-2.5 text-[11.5px] font-semibold text-ink-2 hover:bg-surface-2"
              >
                Undo
              </button>
            ) : null}
            <IconButton label="Add an entry" onClick={() => setAdding(true)}>
              <PlusIcon className="h-[15px] w-[15px]" />
            </IconButton>
          </>
        }
      />

      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search name, description or note"
        aria-label="Search transactions"
        className="mb-2.5 w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-[13px] outline-none placeholder:text-ink-3"
      />
      <Segmented options={FILTERS} value={filter} onChange={setFilter} />

      {manyAccounts || months.length > 1 ? (
        <div className="mt-2.5 flex gap-2">
          {manyAccounts ? (
            <Select
              aria-label="Filter by account"
              className="flex-1 py-1.5 text-[12px]"
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
              options={[
                { value: ANY, label: 'Every account' },
                ...workspace.accounts.map((entry) => ({ value: entry.id, label: entry.label })),
              ]}
            />
          ) : null}
          {months.length > 1 ? (
            <Select
              aria-label="Filter by month"
              className="flex-1 py-1.5 text-[12px]"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              options={[
                { value: ANY, label: 'Every month' },
                ...months.map((value) => ({
                  value,
                  label: `${monthLabel(value, workspace.locale)} ${value.slice(0, 4)}`,
                })),
              ]}
            />
          ) : null}
        </div>
      ) : null}

      {visible.length > 0 ? (
        <div className="mt-2.5 flex gap-4 border-b border-border pb-2.5 text-[11.5px]">
          <span className="text-ink-3">
            In{' '}
            <strong className="font-semibold text-inflow">
              {moneyWhole(fromMinor(totals.inflow, workspace.displayCurrency))}
            </strong>
          </span>
          <span className="text-ink-3">
            Out{' '}
            <strong className="font-semibold text-ink">
              {moneyWhole(fromMinor(totals.outflow, workspace.displayCurrency))}
            </strong>
          </span>
        </div>
      ) : (
        <p className="py-10 text-center text-[13px] text-ink-3">Nothing matches.</p>
      )}

      {groups.map(([date, entries]) => (
        <section key={date}>
          <h2 className="pt-3 pb-0.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-ink-3">
            {fullDay(date)}
          </h2>
          {entries.map((entry) => {
            const party = counterparty(entry.counterpartyId)
            const isMove = party?.role === 'account'
            return (
              <ListRow
                key={entry.id}
                leading={<Initials name={party?.displayName ?? entry.description} />}
                title={
                  <span className="flex items-center gap-1.5">
                    {party?.displayName ?? entry.description}
                    {entry.source === 'manual' && entry.transferId === null ? (
                      <Chip>typed</Chip>
                    ) : null}
                  </span>
                }
                subtitle={describe(entry, party?.role, manyAccounts ? account(entry.accountId) : '')}
                trailing={
                  <Amount
                    text={`${entry.direction === 'in' ? '+' : '−'}${money(entry.amount)}`}
                    tone={isMove ? 'flat' : entry.direction === 'in' ? 'in' : 'out'}
                  />
                }
                onClick={() => setEditing(entry)}
              />
            )
          })}
        </section>
      ))}

      {adding ? <EntrySheet onClose={() => setAdding(false)} /> : null}
      {editing ? (
        <EntrySheet editing={editing} onClose={() => setEditing(null)} />
      ) : null}
      {workspace.counterparties.length > 0 ? (
        <p className="mt-6 text-center text-[11px] text-ink-3">
          Tap any row to change or remove it.{' '}
          <button
            type="button"
            onClick={() => navigate('/people')}
            className="underline underline-offset-2"
          >
            Labels live under People.
          </button>
        </p>
      ) : null}
    </>
  )
}

function describe(entry: Transaction, role: string | undefined, accountLabel: string): string {
  const parts = [entry.note.trim() === '' ? roleLabel(role) : entry.note.trim()]
  if (accountLabel !== '') parts.push(accountLabel)
  return parts.join(' · ')
}

function groupByDay(entries: readonly Transaction[]): [string, Transaction[]][] {
  const groups = new Map<string, Transaction[]>()
  for (const entry of entries) {
    const bucket = groups.get(entry.date)
    if (bucket) bucket.push(entry)
    else groups.set(entry.date, [entry])
  }
  return [...groups.entries()]
}

export function roleLabel(role: string | undefined): string {
  switch (role) {
    case 'account':
      return 'Between your accounts'
    case 'client':
      return 'Client'
    case 'lent':
      return 'Lent'
    case 'support':
      return 'Support'
    case 'spending':
      return 'Spending'
    default:
      return 'Needs a label'
  }
}
