import type { Transaction } from '@cadence/core'
import { useMemo, useState } from 'react'
import { Amount, Initials, ListRow, Segmented } from '~/components/primitives'
import { PageHeader } from '~/components/shell'
import { useRouter } from '~/lib/router'
import { useWorkspace } from '~/lib/workspace'

type Filter = 'all' | 'in' | 'out' | 'moves'

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'in', label: 'In' },
  { value: 'out', label: 'Out' },
  { value: 'moves', label: 'Moves' },
] as const

export function ActivityPage() {
  const { workspace, money, fullDay, counterparty } = useWorkspace()
  const { navigate } = useRouter()
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')

  const visible = useMemo(() => {
    const search = query.trim().toLowerCase()
    return workspace.transactions
      .filter((entry) => {
        const party = counterparty(entry.counterpartyId)
        const isMove = party?.role === 'account'
        if (filter === 'in' && (entry.direction !== 'in' || isMove)) return false
        if (filter === 'out' && (entry.direction !== 'out' || isMove)) return false
        if (filter === 'moves' && !isMove) return false
        if (search === '') return true
        return `${party?.displayName ?? ''} ${entry.description}`.toLowerCase().includes(search)
      })
      .slice()
      .reverse()
  }, [workspace.transactions, filter, query, counterparty])

  const groups = useMemo(() => groupByDay(visible), [visible])

  return (
    <>
      <PageHeader title="Activity" subtitle={`${visible.length} of ${workspace.transactions.length}`} />
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search name or description"
        aria-label="Search transactions"
        className="mb-2.5 w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-[13px] outline-none placeholder:text-ink-3"
      />
      <Segmented options={FILTERS} value={filter} onChange={setFilter} />

      {groups.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-ink-3">Nothing matches.</p>
      ) : null}

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
                title={party?.displayName ?? entry.description}
                subtitle={roleLabel(party?.role)}
                trailing={
                  <Amount
                    text={`${entry.direction === 'in' ? '+' : '−'}${money(entry.amount)}`}
                    tone={isMove ? 'flat' : entry.direction === 'in' ? 'in' : 'out'}
                  />
                }
                onClick={party ? () => navigate(`/person/${party.id}`) : undefined}
              />
            )
          })}
        </section>
      ))}
    </>
  )
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
