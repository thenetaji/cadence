import { fromMinor, overview, toMajor, type Money } from '@cadence/core'
import { useMemo } from 'react'
import { PairedBars } from '~/components/charts'
import { PlusIcon, SettingsIcon } from '~/components/icons'
import {
  Amount,
  Button,
  Card,
  EmptyState,
  Hero,
  Initials,
  ListRow,
  Note,
  SectionHeading,
  StatTile,
} from '~/components/primitives'
import { IconButton, PageHeader } from '~/components/shell'
import { useRouter } from '~/lib/router'
import { useWorkspace } from '~/lib/workspace'

const MONTHS_SHOWN = 6
const DECISIONS_SHOWN = 4

export function OverviewPage({
  onImport,
  onSettings,
}: {
  onImport: () => void
  onSettings: () => void
}) {
  const { workspace, money, moneyWhole, moneyCompact, day, counterparty } = useWorkspace()
  const { navigate } = useRouter()

  const summary = useMemo(
    () => overview(workspace, workspace.displayCurrency),
    [workspace],
  )

  if (workspace.transactions.length === 0) {
    return (
      <>
        <PageHeader title="Overview" />
        <EmptyState
          title="Nothing yet"
          body="Import a statement to begin. Everything is read on this device — the file never leaves it."
          action={<Button onClick={onImport}>Import a statement</Button>}
        />
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
            <IconButton label="Import a statement" onClick={onImport}>
              <PlusIcon className="h-[15px] w-[15px]" />
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
          <div className="mt-2.5 h-[5px] overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full rounded-full bg-ink"
              style={{ width: `${Math.min(100, ((runwayMonths ?? 0) / 12) * 100)}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-ink-3">
            Cash you can spend today. Money you have lent is not counted.
          </p>
        </Card>
      </div>

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
            format={(value) =>
              moneyCompact(fromMinor(Math.round(value * 100), workspace.displayCurrency))
            }
          />
        </Card>
      </section>

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
