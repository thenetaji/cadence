import { fromMinor, incomeRhythm, toMajor } from '@cadence/core'
import { useMemo } from 'react'
import { RankedBars } from '~/components/charts'
import { Card, EmptyState, Hero, Note, SectionHeading, StatTile } from '~/components/primitives'
import { PageHeader } from '~/components/shell'
import { useRouter } from '~/lib/router'
import { useWorkspace } from '~/lib/workspace'
import { monthLabel } from './overview'

export function IncomePage() {
  const { workspace, money, moneyWhole, moneyCompact } = useWorkspace()
  const { navigate } = useRouter()

  const rhythm = useMemo(
    () => incomeRhythm(workspace, workspace.displayCurrency),
    [workspace],
  )

  if (rhythm.clients.length === 0) {
    return (
      <>
        <PageHeader title="Income" />
        <EmptyState
          title="No clients labelled"
          body="Label the names that pay you as clients, and this page will show how evenly the money arrives."
          action={
            <button
              type="button"
              onClick={() => navigate('/people')}
              className="text-[13.5px] font-semibold underline underline-offset-2"
            >
              Go to People
            </button>
          }
        />
      </>
    )
  }

  const peak = Math.max(...rhythm.months.map((month) => toMajor(month.inflow)), 1)
  const average = fromMinor(
    Math.round(rhythm.received.minor / Math.max(1, rhythm.months.length)),
    workspace.displayCurrency,
  )

  return (
    <>
      <PageHeader
        title="Income"
        subtitle={`${rhythm.months.length} months · ${rhythm.clients.length} clients`}
      />

      <Hero
        label="Received"
        value={money(rhythm.received)}
        meta={`${moneyWhole(average)} a month on average`}
      />

      <section className="mb-4">
        <SectionHeading title="By month" aside="one bar per month" />
        <Card>
          <div className="flex h-[72px] items-end gap-1">
            {rhythm.months.map((month) => {
              const value = toMajor(month.inflow)
              return (
                <div key={month.month} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className={value === 0 ? 'w-full rounded-[3px] bg-border-strong' : 'w-full rounded-[3px] bg-inflow'}
                      style={{ height: `${Math.max(2, (value / peak) * 100)}%` }}
                      title={`${month.month}: ${money(month.inflow)}`}
                    />
                  </div>
                  <span className="text-[8.5px] text-ink-3">
                    {monthLabel(month.month, workspace.locale).slice(0, 1)}
                  </span>
                </div>
              )
            })}
          </div>
        </Card>
      </section>

      <div className="grid grid-cols-2 gap-2.5">
        <StatTile
          label="Longest gap"
          value={rhythm.longestGapDays === null ? '—' : `${rhythm.longestGapDays} days`}
          detail="between payments"
        />
        <StatTile
          label="Top client"
          value={`${Math.round(rhythm.topClientShare * 100)}%`}
          detail="of all income"
        />
      </div>

      <section className="mt-5">
        <SectionHeading title="Clients" aside="share of income" />
        <Card>
          <RankedBars
            tone="inflow"
            data={rhythm.clients.map((client) => ({
              key: client.counterparty.id,
              label: client.counterparty.displayName,
              value: toMajor(client.inflow),
              display: moneyCompact(client.inflow),
            }))}
            onSelect={(id) => navigate(`/person/${id}`)}
          />
        </Card>
      </section>

      {rhythm.topClientShare > 0.5 ? (
        <div className="mt-4">
          <Note>
            <strong className="text-ink">
              One client is {Math.round(rhythm.topClientShare * 100)}% of your income.
            </strong>{' '}
            Losing them costs more than any spending change could recover.
          </Note>
        </div>
      ) : null}

      {rhythm.monthsWithoutIncome > 0 ? (
        <div className="mt-3">
          <Note>
            <strong className="text-ink">
              {rhythm.monthsWithoutIncome} month
              {rhythm.monthsWithoutIncome === 1 ? '' : 's'} with nothing coming in.
            </strong>{' '}
            Your runway needs to cover a gap that long.
          </Note>
        </div>
      ) : null}
    </>
  )
}
