import {
  fromMinor,
  lentOutstanding,
  partyTotals,
  type CounterpartyRole,
  type PartyTotals,
} from '@cadence/core'
import { useMemo, useState } from 'react'
import { Amount, Card, Initials, ListRow, SectionHeading, Segmented } from '~/components/primitives'
import { PageHeader } from '~/components/shell'
import { useRouter } from '~/lib/router'
import { useWorkspace } from '~/lib/workspace'

const ROLE_OPTIONS: readonly { value: CounterpartyRole; label: string }[] = [
  { value: 'spending', label: 'Spending' },
  { value: 'account', label: 'Mine' },
  { value: 'lent', label: 'Lent' },
  { value: 'client', label: 'Client' },
  { value: 'support', label: 'Support' },
]

const GROUPS = [
  { role: 'lent', title: 'Money lent', hint: 'expected back' },
  { role: 'client', title: 'Clients', hint: 'money in' },
  { role: 'support', title: 'Support', hint: 'family and friends' },
  { role: 'account', title: 'Your own accounts', hint: 'not spending' },
  { role: 'spending', title: 'Spending', hint: 'by value' },
] as const

export function PeoplePage() {
  const { workspace, money, assignRole } = useWorkspace()
  const { navigate } = useRouter()
  const [query, setQuery] = useState('')

  const totals = useMemo(
    () => partyTotals(workspace, workspace.displayCurrency),
    [workspace],
  )
  const outstanding = useMemo(
    () => lentOutstanding(workspace, workspace.displayCurrency),
    [workspace],
  )

  const search = query.trim().toLowerCase()
  const matching = totals.filter((entry) =>
    search === '' ? true : entry.counterparty.displayName.toLowerCase().includes(search),
  )
  const unlabelled = matching
    .filter((entry) => entry.counterparty.role === 'unassigned')
    .sort((left, right) => magnitude(right) - magnitude(left))

  return (
    <>
      <PageHeader
        title="People"
        subtitle={`${totals.length} names · ${unlabelled.length} need a label`}
      />
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search names"
        aria-label="Search people"
        className="mb-3 w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-[13px] outline-none placeholder:text-ink-3"
      />

      {unlabelled.length > 0 ? (
        <section className="mb-5">
          <SectionHeading title="Needs a label" aside="largest first" />
          <div className="flex flex-col gap-2.5">
            {unlabelled.map((entry) => (
              <Card key={entry.counterparty.id}>
                <div className="flex items-center gap-2.5">
                  <Initials name={entry.counterparty.displayName} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium">
                      {entry.counterparty.displayName}
                    </div>
                    <div className="mt-px text-[11px] text-ink-3">
                      {entry.count} transaction{entry.count === 1 ? '' : 's'} ·{' '}
                      {money(entry.outflow.minor > 0 ? entry.outflow : entry.inflow)}
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <Segmented
                    options={ROLE_OPTIONS}
                    value={entry.counterparty.role}
                    onChange={(role) => assignRole(entry.counterparty.id, role)}
                  />
                </div>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {outstanding.length > 0 ? (
        <section className="mb-5">
          <SectionHeading
            title="Owed to you"
            aside={money(
              fromMinor(
                outstanding.reduce((total, entry) => total - entry.net.minor, 0),
                workspace.displayCurrency,
              ),
            )}
          />
          {outstanding.map((entry) => (
            <PersonRow
              key={entry.counterparty.id}
              entry={entry}
              amount={money(fromMinor(-entry.net.minor, workspace.displayCurrency))}
              tone="out"
              onOpen={() => navigate(`/person/${entry.counterparty.id}`)}
            />
          ))}
        </section>
      ) : null}

      {GROUPS.map((group) => {
        const rows = matching
          .filter((entry) => entry.counterparty.role === group.role)
          .sort((left, right) => magnitude(right) - magnitude(left))
          .slice(0, 12)
        if (rows.length === 0) return null
        return (
          <section key={group.role} className="mb-5">
            <SectionHeading title={group.title} aside={group.hint} />
            {rows.map((entry) => (
              <PersonRow
                key={entry.counterparty.id}
                entry={entry}
                amount={money(entry.inflow.minor > entry.outflow.minor ? entry.inflow : entry.outflow)}
                tone={group.role === 'client' ? 'in' : group.role === 'account' ? 'flat' : 'out'}
                onOpen={() => navigate(`/person/${entry.counterparty.id}`)}
              />
            ))}
          </section>
        )
      })}
    </>
  )
}

function magnitude(entry: PartyTotals): number {
  return Math.max(entry.inflow.minor, entry.outflow.minor)
}

function PersonRow({
  entry,
  amount,
  tone,
  onOpen,
}: {
  entry: PartyTotals
  amount: string
  tone: 'in' | 'out' | 'flat'
  onOpen: () => void
}) {
  return (
    <ListRow
      leading={<Initials name={entry.counterparty.displayName} />}
      title={entry.counterparty.displayName}
      subtitle={`${entry.count} transaction${entry.count === 1 ? '' : 's'}`}
      trailing={<Amount text={amount} tone={tone} />}
      onClick={onOpen}
    />
  )
}
