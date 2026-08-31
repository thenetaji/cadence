import {
  daysBetween,
  fromMinor,
  partyTotals,
  todayIso,
  type CounterpartyRole,
  type Transaction,
} from '@cadence/core'
import { useMemo, useState } from 'react'
import { Field, TextArea, TextInput } from '~/components/form'
import {
  Amount,
  Button,
  Card,
  Hero,
  ListRow,
  Note,
  SectionHeading,
  Segmented,
  StatTile,
} from '~/components/primitives'
import { PageHeader, Sheet } from '~/components/shell'
import { useRouter } from '~/lib/router'
import { useWorkspace } from '~/lib/workspace'
import { roleLabel } from './activity'
import { EntrySheet } from './entry'

const ROLE_OPTIONS: readonly { value: CounterpartyRole; label: string }[] = [
  { value: 'spending', label: 'Spending' },
  { value: 'account', label: 'Mine' },
  { value: 'lent', label: 'Lent' },
  { value: 'client', label: 'Client' },
  { value: 'support', label: 'Support' },
]

export function PersonPage({ counterpartyId }: { counterpartyId: string }) {
  const { workspace, money, day, assignRole, combine, setDueDate, setPartyNote } = useWorkspace()
  const { navigate } = useRouter()
  const [merging, setMerging] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [noteDraft, setNoteDraft] = useState<string | null>(null)

  const totals = useMemo(
    () => partyTotals(workspace, workspace.displayCurrency),
    [workspace],
  )
  const entry = totals.find((candidate) => candidate.counterparty.id === counterpartyId)

  if (!entry) {
    return (
      <>
        <PageHeader title="Not found" onBack={() => navigate('/people')} />
        <p className="text-[13px] text-ink-3">That name is no longer in your data.</p>
      </>
    )
  }

  const { counterparty } = entry
  const transactions = workspace.transactions
    .filter((item) => item.counterpartyId === counterpartyId)
    .slice()
    .reverse()

  const isLent = counterparty.role === 'lent'
  const outstanding = fromMinor(-entry.net.minor, workspace.displayCurrency)
  const heldDays =
    entry.firstDate && entry.lastDate ? daysBetween(entry.firstDate, todayIso()) : null
  const largest = transactions.reduce(
    (best, item) => (item.amount.minor > best ? item.amount.minor : best),
    0,
  )

  return (
    <>
      <PageHeader
        title={counterparty.displayName}
        subtitle={`${roleLabel(counterparty.role)} · ${entry.count} transactions`}
        onBack={() => navigate('/people')}
      />

      <Hero
        label={isLent ? 'Outstanding' : entry.outflow.minor > entry.inflow.minor ? 'Paid out' : 'Received'}
        value={money(
          isLent
            ? outstanding
            : entry.outflow.minor > entry.inflow.minor
              ? entry.outflow
              : entry.inflow,
        )}
        meta={
          isLent
            ? `${money(entry.outflow)} sent · ${money(entry.inflow)} back`
            : `First seen ${entry.firstDate ? day(entry.firstDate) : 'recently'}`
        }
      />

      <div className="grid grid-cols-2 gap-2.5">
        <StatTile
          label="Largest"
          value={money(fromMinor(largest, workspace.displayCurrency))}
        />
        <StatTile
          label={isLent ? 'Held for' : 'Active for'}
          value={heldDays === null ? '—' : `${heldDays} days`}
          detail={entry.firstDate ? `since ${day(entry.firstDate)}` : undefined}
        />
      </div>

      {isLent && entry.inflow.minor === 0 ? (
        <div className="mt-3">
          <Note>
            <strong className="text-ink">Nothing returned yet.</strong> This is counted as yours but
            is not part of your runway.
          </Note>
        </div>
      ) : null}

      {isLent ? (
        <section className="mt-3">
          <Card>
            <Field
              label="Expected back"
              hint={
                counterparty.dueDate === null
                  ? 'A date puts this in the Plan screen and warns you once it passes.'
                  : overdue(counterparty.dueDate)
                    ? `${daysBetween(counterparty.dueDate, todayIso())} days past.`
                    : `${daysBetween(todayIso(), counterparty.dueDate)} days away.`
              }
            >
              <TextInput
                type="date"
                value={counterparty.dueDate ?? ''}
                onChange={(event) =>
                  setDueDate(counterparty.id, event.target.value === '' ? null : event.target.value)
                }
              />
            </Field>
          </Card>
        </section>
      ) : null}

      <section className="mt-3">
        <Card>
          <Field label="Note" hint="Kept with this name, not with any one movement.">
            <TextArea
              rows={2}
              value={noteDraft ?? counterparty.note}
              placeholder="What this is, what was agreed"
              onChange={(event) => setNoteDraft(event.target.value)}
              onBlur={() => {
                if (noteDraft !== null && noteDraft !== counterparty.note) {
                  setPartyNote(counterparty.id, noteDraft)
                }
                setNoteDraft(null)
              }}
            />
          </Field>
        </Card>
      </section>

      <section className="mt-5">
        <SectionHeading title="Label" aside="applies to every transaction with this name" />
        <Segmented
          options={ROLE_OPTIONS}
          value={counterparty.role}
          onChange={(role) => assignRole(counterparty.id, role)}
        />
        <div className="mt-2.5">
          <Button variant="ghost" onClick={() => setMerging(true)} className="w-full">
            Same as another name
          </Button>
        </div>
        {counterparty.aliases.length > 0 ? (
          <p className="mt-2 text-[11.5px] text-ink-3">
            Also matches: {counterparty.aliases.join(', ')}
          </p>
        ) : null}
      </section>

      <section className="mt-5">
        <SectionHeading title="Movements" aside="tap one to change it" />
        {transactions.map((item) => (
          <ListRow
            key={item.id}
            title={item.direction === 'in' ? 'Received' : 'Sent'}
            subtitle={`${day(item.date)} · ${item.description}`}
            trailing={
              <Amount
                text={money(item.amount)}
                tone={item.direction === 'in' ? 'in' : 'out'}
              />
            }
            onClick={() => setEditing(item)}
          />
        ))}
      </section>

      {merging ? (
        <Sheet
          title="Same as another name"
          description="Banks write the same person differently. Combining keeps every transaction and adds up correctly."
          onClose={() => setMerging(false)}
        >
          <ul className="max-h-[50dvh] overflow-y-auto">
            {totals
              .filter((candidate) => candidate.counterparty.id !== counterpartyId)
              .map((candidate) => (
                <ListRow
                  key={candidate.counterparty.id}
                  title={candidate.counterparty.displayName}
                  subtitle={`${candidate.count} transaction${candidate.count === 1 ? '' : 's'}`}
                  onClick={() => {
                    combine(counterpartyId, candidate.counterparty.id)
                    setMerging(false)
                  }}
                />
              ))}
          </ul>
        </Sheet>
      ) : null}

      {editing ? <EntrySheet editing={editing} onClose={() => setEditing(null)} /> : null}
    </>
  )
}

function overdue(date: string): boolean {
  return date < todayIso()
}

