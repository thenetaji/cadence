import {
  dueScheduled,
  forecast,
  fromMinor,
  lendingDue,
  monthProgress,
  occurrencesBetween,
  parseAmount,
  todayIso,
  addDays,
  toMajor,
  type ScheduledItem,
} from '@cadence/core'
import { useMemo, useState } from 'react'
import { TrendLine } from '~/components/charts'
import { AmountInput, Field, FormActions } from '~/components/form'
import { PlusIcon } from '~/components/icons'
import {
  Amount,
  Banner,
  Button,
  Card,
  Chip,
  EmptyState,
  Initials,
  ListRow,
  Progress,
  SectionHeading,
  StatTile,
} from '~/components/primitives'
import { IconButton, PageHeader, Sheet } from '~/components/shell'
import { useRouter } from '~/lib/router'
import { useWorkspace } from '~/lib/workspace'
import { CADENCE_LABELS, ScheduleSheet } from './schedule'

const FORECAST_DAYS = 90
const COMMITTED_DAYS = 30

export function PlanPage() {
  const {
    workspace,
    money,
    moneyWhole,
    moneyCompact,
    day,
    recordSchedule,
    skipSchedule,
  } = useWorkspace()
  const { navigate } = useRouter()
  const [editing, setEditing] = useState<ScheduledItem | null>(null)
  const [adding, setAdding] = useState(false)
  const [settingTarget, setSettingTarget] = useState(false)

  const today = todayIso()
  const currency = workspace.displayCurrency

  const due = useMemo(() => dueScheduled(workspace, today), [workspace, today])
  const projection = useMemo(
    () => forecast(workspace, currency, FORECAST_DAYS, today),
    [workspace, currency, today],
  )
  const committed = useMemo(
    () => occurrencesBetween(workspace, today, addDays(today, COMMITTED_DAYS)),
    [workspace, today],
  )
  const progress = useMemo(() => monthProgress(workspace, currency, today), [workspace, currency, today])
  const lending = useMemo(() => lendingDue(workspace, currency, today), [workspace, currency, today])

  const upcoming = committed.filter((entry) => entry.date > today)
  const hasAnything = workspace.transactions.length > 0 || workspace.scheduled.length > 0

  if (!hasAnything) {
    return (
      <>
        <PageHeader title="Plan" />
        <EmptyState
          title="Nothing planned"
          body="Add what repeats — rent, a subscription, a retainer — and Cadence can show where the balance is heading rather than only where it has been."
          action={<Button onClick={() => setAdding(true)}>Add something that repeats</Button>}
        />
        {adding ? <ScheduleSheet onClose={() => setAdding(false)} /> : null}
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Plan"
        subtitle={`${workspace.scheduled.filter((item) => !item.paused).length} repeating · ${upcoming.length} due in ${COMMITTED_DAYS} days`}
        actions={
          <IconButton label="Add something that repeats" onClick={() => setAdding(true)}>
            <PlusIcon className="h-[15px] w-[15px]" />
          </IconButton>
        }
      />

      {due.length > 0 ? (
        <section className="mb-5">
          <SectionHeading title="Due now" aside={`${due.length}`} />
          <div className="flex flex-col gap-2.5">
            {due.map((item) => (
              <Card key={item.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-[13.5px] font-semibold">{item.label}</div>
                    <div className="mt-px text-[11.5px] text-ink-3">
                      expected {day(item.nextDate)} · {CADENCE_LABELS[item.cadence].toLowerCase()}
                    </div>
                  </div>
                  <Amount
                    text={`${item.direction === 'in' ? '+' : '−'}${money(item.amount)}`}
                    tone={item.direction === 'in' ? 'in' : 'out'}
                  />
                </div>
                <div className="mt-3 flex gap-2">
                  <Button className="flex-1" onClick={() => recordSchedule(item.id)}>
                    Record it
                  </Button>
                  <Button variant="ghost" className="flex-1" onClick={() => skipSchedule(item.id)}>
                    Skip
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mb-5">
        <SectionHeading title="Where this is heading" aside={`next ${FORECAST_DAYS} days`} />
        <Card>
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-3">
                Balance in {FORECAST_DAYS} days
              </div>
              <div className="mt-1 text-[22px] font-semibold tracking-[-0.03em]">
                {money(projection.endBalance)}
              </div>
            </div>
            {projection.daysUntilEmpty === null ? null : (
              <Chip tone="out">empty in {projection.daysUntilEmpty} days</Chip>
            )}
          </div>

          <TrendLine
            data={projection.points.map((point) => ({
              key: point.date,
              label: day(point.date),
              value: toMajor(point.balance),
              marked: point.committed,
            }))}
            format={(value) => moneyCompact(fromMinor(Math.round(value * 100), currency))}
            caption={`Projected balance for each of the next ${FORECAST_DAYS} days`}
          />

          <p className="mt-2.5 text-[11px] leading-relaxed text-ink-3">
            Everything below is scheduled, plus {money(projection.everydayDaily)} a day of ordinary
            spending at your recent rate. Bills already listed are not counted twice.
          </p>
        </Card>

        <div className="mt-2.5 grid grid-cols-2 gap-2.5">
          <StatTile
            label={`Coming in · ${COMMITTED_DAYS}d`}
            marker="inflow"
            value={moneyWhole(projection.committedIn)}
          />
          <StatTile
            label={`Going out · ${COMMITTED_DAYS}d`}
            marker="outflow"
            value={moneyWhole(projection.committedOut)}
          />
        </div>
      </section>

      <section className="mb-5">
        <SectionHeading
          title="This month"
          aside={
            <button
              type="button"
              onClick={() => setSettingTarget(true)}
              className="font-semibold text-ink underline underline-offset-2"
            >
              {progress.target ? 'Change target' : 'Set a target'}
            </button>
          }
        />
        <Card>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[19px] font-semibold tracking-[-0.025em]">
              {money(progress.spent)}
            </span>
            <span className="text-[11.5px] text-ink-3">
              {progress.target ? `of ${moneyWhole(progress.target)}` : 'spent so far'}
            </span>
          </div>

          {progress.target ? (
            <>
              <div className="mt-2.5">
                <Progress
                  value={progress.spent.minor}
                  of={progress.target.minor}
                  tone={(progress.remaining?.minor ?? 0) < 0 ? 'over' : undefined}
                />
              </div>
              <p className="mt-2 text-[11.5px] text-ink-2">
                {(progress.remaining?.minor ?? 0) < 0 ? (
                  <>
                    <strong className="text-outflow">
                      {money(fromMinor(-(progress.remaining?.minor ?? 0), currency))} over
                    </strong>{' '}
                    with {progress.daysLeft} day{progress.daysLeft === 1 ? '' : 's'} to go.
                  </>
                ) : (
                  <>
                    {money(progress.remaining ?? progress.spent)} left ·{' '}
                    {money(progress.dailyAllowance ?? progress.spent)} a day for {progress.daysLeft}{' '}
                    day{progress.daysLeft === 1 ? '' : 's'}.
                  </>
                )}
              </p>
              {progress.pace !== null && progress.pace > 1.15 ? (
                <p className="mt-1 text-[11px] text-ink-3">
                  Going out {Math.round((progress.pace - 1) * 100)}% faster than the target allows.
                </p>
              ) : null}
            </>
          ) : (
            <p className="mt-2 text-[11.5px] text-ink-3">
              A target turns this into something you can act on before the month ends.
            </p>
          )}
        </Card>
      </section>

      <section className="mb-5">
        <SectionHeading title="Repeating" aside={`${workspace.scheduled.length}`} />
        {workspace.scheduled.length === 0 ? (
          <Banner>
            Nothing repeating yet. Rent, a subscription or a retainer takes a moment to add and
            changes what the forecast above can tell you.
          </Banner>
        ) : (
          workspace.scheduled.map((item) => (
            <ListRow
              key={item.id}
              leading={<Initials name={item.label} />}
              title={
                <span className={item.paused ? 'text-ink-3 line-through' : undefined}>
                  {item.label}
                </span>
              }
              subtitle={`${CADENCE_LABELS[item.cadence]} · next ${day(item.nextDate)}`}
              trailing={
                <Amount
                  text={`${item.direction === 'in' ? '+' : '−'}${money(item.amount)}`}
                  tone={item.paused ? 'flat' : item.direction === 'in' ? 'in' : 'out'}
                />
              }
              onClick={() => setEditing(item)}
            />
          ))
        )}
      </section>

      {lending.length > 0 ? (
        <section className="mb-5">
          <SectionHeading title="Money out with people" aside="soonest first" />
          {lending.map((entry) => (
            <ListRow
              key={entry.entry.counterparty.id}
              leading={<Initials name={entry.entry.counterparty.displayName} />}
              title={entry.entry.counterparty.displayName}
              subtitle={
                entry.dueDate === null
                  ? 'No date set'
                  : (entry.daysUntilDue ?? 0) < 0
                    ? `${Math.abs(entry.daysUntilDue ?? 0)} days past ${day(entry.dueDate)}`
                    : `Back by ${day(entry.dueDate)}`
              }
              trailing={
                <Amount
                  text={money(entry.outstanding)}
                  tone={(entry.daysUntilDue ?? 0) < 0 ? 'out' : 'flat'}
                />
              }
              onClick={() => navigate(`/person/${entry.entry.counterparty.id}`)}
            />
          ))}
        </section>
      ) : null}

      {adding ? <ScheduleSheet onClose={() => setAdding(false)} /> : null}
      {editing ? <ScheduleSheet editing={editing} onClose={() => setEditing(null)} /> : null}
      {settingTarget ? <TargetSheet onClose={() => setSettingTarget(false)} /> : null}
    </>
  )
}

function TargetSheet({ onClose }: { onClose: () => void }) {
  const { workspace, setPlan, moneyWhole } = useWorkspace()
  const currency = workspace.displayCurrency
  const current = workspace.plan.monthlySpendingTarget
  const [value, setValue] = useState(current ? String(toMajor(current)) : '')
  const [problem, setProblem] = useState<string | null>(null)

  const suggestion = useMemo(() => {
    const months = new Map<string, number>()
    for (const entry of workspace.transactions) {
      if (entry.direction !== 'out') continue
      const month = entry.date.slice(0, 7)
      months.set(month, (months.get(month) ?? 0) + entry.amount.minor)
    }
    const recent = [...months.entries()].sort().slice(-6)
    if (recent.length === 0) return null
    const average = recent.reduce((total, [, amount]) => total + amount, 0) / recent.length
    return fromMinor(Math.round(average), currency)
  }, [workspace.transactions, currency])

  const submit = () => {
    if (value.trim() === '') {
      setPlan({ monthlySpendingTarget: null })
      onClose()
      return
    }
    try {
      setPlan({ monthlySpendingTarget: parseAmount(value, currency) })
      onClose()
    } catch {
      setProblem('That amount could not be read.')
    }
  }

  return (
    <Sheet
      title="Monthly spending target"
      description="What you mean to keep ordinary spending under. Money moved between your own accounts and money lent are left out of it."
      onClose={onClose}
    >
      <Field
        label="Target"
        problem={problem}
        hint={suggestion ? `You have averaged ${moneyWhole(suggestion)} a month.` : undefined}
      >
        <AmountInput
          currency={currency}
          value={value}
          autoFocus
          placeholder="0.00"
          onChange={(event) => {
            setValue(event.target.value)
            setProblem(null)
          }}
        />
      </Field>
      <FormActions onCancel={onClose} onSubmit={submit} submitLabel="Save target" />
      {current ? (
        <button
          type="button"
          onClick={() => {
            setPlan({ monthlySpendingTarget: null })
            onClose()
          }}
          className="mt-2 h-[38px] w-full rounded-[var(--radius-control)] text-[13px] font-semibold text-ink-3"
        >
          Remove the target
        </button>
      ) : null}
    </Sheet>
  )
}
