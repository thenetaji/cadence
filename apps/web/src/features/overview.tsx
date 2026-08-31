import {
  addDays,
  dueScheduled,
  fromMinor,
  monthProgress,
  overview,
  spendingBreakdown,
  todayIso,
  toMajor,
  type Money,
} from '@cadence/core'
import { useMemo, useState } from 'react'
import { PairedBars, RankedBars } from '~/components/charts'
import { PlusIcon, SettingsIcon, UploadIcon } from '~/components/icons'
import {
  Amount,
  Banner,
  Button,
  Card,
  EmptyState,
  Hero,
  Initials,
  ListRow,
  Note,
  Progress,
  SectionHeading,
  StatTile,
} from '~/components/primitives'
import { IconButton, PageHeader } from '~/components/shell'
import { useRouter } from '~/lib/router'
import { useWorkspace } from '~/lib/workspace'
import { EntrySheet } from './entry'

const MONTHS_SHOWN = 6
const DECISIONS_SHOWN = 4
const BREAKDOWN_SHOWN = 6
const BREAKDOWN_DAYS = 90

export function OverviewPage({
  onImport,
  onSettings,
}: {
  onImport: () => void
  onSettings: () => void
}) {
  const { workspace, money, moneyWhole, moneyCompact, day, counterparty } = useWorkspace()
  const { navigate } = useRouter()
  const [adding, setAdding] = useState(false)

  const today = todayIso()
  const currency = workspace.displayCurrency

  const summary = useMemo(() => overview(workspace, currency), [workspace, currency])
  const due = useMemo(() => dueScheduled(workspace, today), [workspace, today])
  const progress = useMemo(() => monthProgress(workspace, currency, today), [workspace, currency, today])
  const breakdown = useMemo(
    () => spendingBreakdown(workspace, currency, addDays(today, -BREAKDOWN_DAYS)),
    [workspace, currency, today],
  )

  if (workspace.transactions.length === 0) {
    return (
      <>
        <PageHeader title="Overview" />
        <EmptyState
          title="Nothing yet"
          body="Add entries as they happen, or import a statement and start from what has already gone through. Everything is read on this device — nothing is uploaded."
          action={
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button onClick={() => setAdding(true)}>
                <PlusIcon className="h-4 w-4" />
                Add an entry
              </Button>
              <Button variant="ghost" onClick={onImport}>
                <UploadIcon className="h-4 w-4" />
                Import a statement
              </Button>
            </div>
          }
        />
        {adding ? <EntrySheet onClose={() => setAdding(false)} /> : null}
      </>
    )
  }

  const unassigned = workspace.counterparties.filter((entry) => entry.role === 'unassigned').length
  const months = summary.months.slice(-MONTHS_SHOWN)
  const runwayMonths = summary.runway.months

  return (
    <>
      <PageHeader
        title="Overview"
        subtitle={`${workspace.accounts.length} account${workspace.accounts.length === 1 ? '' : 's'} · ${workspace.transactions.length} transactions`}
        actions={
          <>
            <IconButton label="Add an entry" onClick={() => setAdding(true)}>
              <PlusIcon className="h-[15px] w-[15px]" />
            </IconButton>
            <IconButton label="Import a statement" onClick={onImport}>
              <UploadIcon className="h-[15px] w-[15px]" />
            </IconButton>
            <IconButton label="Settings" onClick={onSettings}>
              <SettingsIcon className="h-[15px] w-[15px]" />
            </IconButton>
          </>
        }
      />

      <Hero
        label="In your accounts"
        value={money(summary.available)}
        meta={
          summary.lentOutstanding.minor > 0
            ? `${money(summary.lentOutstanding)} owed to you, held elsewhere`
            : 'Across every account you have added'
        }
      />

      {workspace.accounts.length > 1 ? (
        <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
          {workspace.accounts.map((entry) => (
            <div
              key={entry.id}
              className="min-w-[136px] shrink-0 rounded-[var(--radius-card)] border border-border bg-surface px-3 py-2.5"
            >
              <div className="truncate text-[11px] text-ink-3">{entry.label}</div>
              <div className="mt-0.5 text-[14.5px] font-semibold tracking-[-0.02em]">
                {moneyWhole(entry.closingBalance)}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {due.length > 0 ? (
        <div className="mb-3">
          <Banner tone="warn">
            <strong className="text-ink">{due.length} due now.</strong>{' '}
            {due.map((item) => item.label).slice(0, 3).join(', ')}
            {due.length > 3 ? ' and more' : ''}.{' '}
            <button
              type="button"
              onClick={() => navigate('/plan')}
              className="font-semibold text-ink underline underline-offset-2"
            >
              Record them
            </button>
          </Banner>
        </div>
      ) : null}

      {unassigned > 0 ? (
        <div className="mb-3">
          <Note>
            <strong className="text-ink">{unassigned} unlabelled.</strong> Numbers below stay rough
            until each one is labelled.{' '}
            <button
              type="button"
              onClick={() => navigate('/people')}
              className="font-semibold text-ink underline underline-offset-2"
            >
              Label them
            </button>
          </Note>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2.5">
        <StatTile
          label="In this month"
          marker="inflow"
          value={summary.currentMonth ? moneyWhole(summary.currentMonth.inflow) : '—'}
          detail={summary.currentMonth ? `${summary.currentMonth.count} transactions` : undefined}
        />
        <StatTile
          label="Out this month"
          marker="outflow"
          value={summary.currentMonth ? moneyWhole(summary.currentMonth.outflow) : '—'}
        />
      </div>

      <div className="mt-2.5">
        <Card>
          <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-3">
            Runway
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-[20px] font-semibold tracking-[-0.025em]">
              {runwayMonths === null ? '—' : `${runwayMonths.toFixed(1)} months`}
            </span>
            <span className="text-[11px] text-ink-3">
              at {moneyWhole(summary.runway.monthlyOutflow)} a month
            </span>
          </div>
          <div className="mt-2.5">
            <Progress value={Math.min(runwayMonths ?? 0, 12)} of={12} />
          </div>
          <p className="mt-2 text-[11px] text-ink-3">
            Cash you can spend today. Money you have lent is not counted.
          </p>
        </Card>
      </div>

      {progress.target ? (
        <div className="mt-2.5">
          <Card>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-3">
                Spending this month
              </span>
              <span className="text-[11px] text-ink-3">
                {progress.daysLeft} day{progress.daysLeft === 1 ? '' : 's'} left
              </span>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-[18px] font-semibold tracking-[-0.025em]">
                {money(progress.spent)}
              </span>
              <span className="text-[11px] text-ink-3">of {moneyWhole(progress.target)}</span>
            </div>
            <div className="mt-2.5">
              <Progress
                value={progress.spent.minor}
                of={progress.target.minor}
                tone={(progress.remaining?.minor ?? 0) < 0 ? 'over' : undefined}
              />
            </div>
          </Card>
        </div>
      ) : null}

      <section className="mt-5">
        <SectionHeading
          title="Money in and out"
          aside={
            <span className="inline-flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1">
                <span className="h-[7px] w-[7px] rounded-[2px] bg-inflow" />in
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-[7px] w-[7px] rounded-[2px] bg-outflow" />out
              </span>
            </span>
          }
        />
        <Card>
          <PairedBars
            data={months.map((month) => ({
              key: month.month,
              label: monthLabel(month.month, workspace.locale),
              inflow: toMajor(month.inflow),
              outflow: toMajor(month.outflow),
              caption: `${month.count}`,
            }))}
            labels={{ inflow: 'In', outflow: 'Out' }}
            format={(value) => moneyCompact(fromMinor(Math.round(value * 100), currency))}
          />
        </Card>
      </section>

      {breakdown.length > 0 ? (
        <section className="mt-5">
          <SectionHeading title="Where it goes" aside={`last ${BREAKDOWN_DAYS} days`} />
          <Card>
            <RankedBars
              tone="outflow"
              data={breakdown.slice(0, BREAKDOWN_SHOWN).map((slice) => ({
                key: slice.counterpartyId,
                label: slice.name,
                value: slice.total.minor,
                display: moneyCompact(slice.total),
              }))}
              onSelect={(key) => navigate(`/person/${key}`)}
            />
          </Card>
        </section>
      ) : null}

      {summary.decisions.length > 0 ? (
        <section className="mt-5">
          <SectionHeading
            title="Larger decisions"
            aside={`over ${moneyWhole(quarterOf(summary.runway.monthlyOutflow))}`}
          />
          {summary.decisions.slice(0, DECISIONS_SHOWN).map((entry) => {
            const party = counterparty(entry.counterpartyId)
            return (
              <ListRow
                key={entry.id}
                leading={<Initials name={party?.displayName ?? entry.description} />}
                title={party?.displayName ?? entry.description}
                subtitle={day(entry.date)}
                trailing={<Amount text={money(entry.amount)} tone="out" />}
                onClick={party ? () => navigate(`/person/${party.id}`) : undefined}
              />
            )
          })}
        </section>
      ) : null}

      {adding ? <EntrySheet onClose={() => setAdding(false)} /> : null}
    </>
  )
}

function quarterOf(value: Money): Money {
  return fromMinor(Math.round(value.minor * 0.25), value.currency)
}

export function monthLabel(month: string, locale: string): string {
  const [year, index] = month.split('-').map(Number)
  if (year === undefined || index === undefined) return month
  return new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, index - 1, 1)),
  )
}
