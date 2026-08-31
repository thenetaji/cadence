import {
  cadences,
  parseAmount,
  todayIso,
  toMajor,
  type Cadence,
  type Direction,
  type ScheduledItem,
} from '@cadence/core'
import { useMemo, useState } from 'react'
import {
  AmountInput,
  Field,
  FieldRow,
  FormActions,
  NameInput,
  Select,
  Switch,
  TextArea,
  TextInput,
} from '~/components/form'
import { Banner, Segmented } from '~/components/primitives'
import { Sheet } from '~/components/shell'
import { useWorkspace } from '~/lib/workspace'

const DIRECTIONS = [
  { value: 'out', label: 'Going out' },
  { value: 'in', label: 'Coming in' },
] as const satisfies readonly { value: Direction; label: string }[]

export const CADENCE_LABELS: Readonly<Record<Cadence, string>> = {
  weekly: 'Every week',
  fortnightly: 'Every two weeks',
  monthly: 'Every month',
  quarterly: 'Every three months',
  yearly: 'Every year',
}

const CADENCE_OPTIONS = cadences.map((value) => ({ value, label: CADENCE_LABELS[value] }))

export function ScheduleSheet({
  editing,
  onClose,
}: {
  editing?: ScheduledItem
  onClose: () => void
}) {
  const { workspace, addSchedule, editSchedule, deleteSchedule, counterparty } = useWorkspace()
  const currency = workspace.displayCurrency
  const party = editing ? counterparty(editing.counterpartyId) : undefined

  const [label, setLabel] = useState(editing?.label ?? '')
  const [direction, setDirection] = useState<Direction>(editing?.direction ?? 'out')
  const [amount, setAmount] = useState(editing ? String(toMajor(editing.amount)) : '')
  const [name, setName] = useState(party?.displayName ?? '')
  const [accountId, setAccountId] = useState(editing?.accountId ?? workspace.accounts[0]?.id ?? '')
  const [cadence, setCadence] = useState<Cadence>(editing?.cadence ?? 'monthly')
  const [nextDate, setNextDate] = useState(editing?.nextDate ?? todayIso())
  const [endDate, setEndDate] = useState(editing?.endDate ?? '')
  const [note, setNote] = useState(editing?.note ?? '')
  const [paused, setPaused] = useState(editing?.paused ?? false)
  const [problem, setProblem] = useState<string | null>(null)

  const names = useMemo(
    () => workspace.counterparties.map((entry) => entry.displayName).sort(),
    [workspace.counterparties],
  )
  const accountOptions = useMemo(
    () => workspace.accounts.map((entry) => ({ value: entry.id, label: entry.label })),
    [workspace.accounts],
  )

  if (workspace.accounts.length === 0) {
    return (
      <Sheet title="An account first" onClose={onClose}>
        <Banner>Add an account before planning what leaves it.</Banner>
      </Sheet>
    )
  }

  const submit = () => {
    let value
    try {
      value = parseAmount(amount, currency)
    } catch {
      setProblem('That amount could not be read.')
      return
    }
    if (value.minor <= 0) {
      setProblem('The amount has to be more than zero.')
      return
    }
    if (label.trim() === '' && name.trim() === '') {
      setProblem('Give it a name — Rent, Retainer, anything you will recognise.')
      return
    }

    try {
      if (editing) {
        editSchedule(editing.id, {
          label: label.trim() === '' ? name.trim() : label.trim(),
          direction,
          amount: value,
          accountId,
          cadence,
          nextDate,
          endDate: endDate === '' ? null : endDate,
          note,
          paused,
        })
      } else {
        addSchedule({
          label: label.trim(),
          accountId,
          counterpartyName: name.trim() === '' ? label.trim() : name.trim(),
          direction,
          amount: value,
          channel: 'transfer',
          cadence,
          nextDate,
          endDate: endDate === '' ? null : endDate,
          note,
        })
      }
      onClose()
    } catch (error) {
      setProblem(error instanceof Error ? error.message : 'That could not be saved.')
    }
  }

  return (
    <Sheet
      title={editing ? 'Edit a repeat' : 'Something that repeats'}
      description="Rent, a subscription, a retainer. Recording one moves it on to the next date."
      onClose={onClose}
    >
      <div className="mb-3">
        <Segmented options={DIRECTIONS} value={direction} onChange={setDirection} />
      </div>

      <Field label="Amount" problem={problem}>
        <AmountInput
          currency={currency}
          value={amount}
          placeholder="0.00"
          onChange={(event) => {
            setAmount(event.target.value)
            setProblem(null)
          }}
        />
      </Field>

      <Field label="Name">
        <TextInput
          value={label}
          placeholder={direction === 'out' ? 'Rent' : 'Monthly retainer'}
          onChange={(event) => setLabel(event.target.value)}
        />
      </Field>

      <Field label={direction === 'in' ? 'From' : 'To'} hint="Kept with everything else in this name.">
        <NameInput
          listId="known-names-schedule"
          suggestions={names}
          value={name}
          placeholder={direction === 'in' ? 'Northwind Studio' : 'Landlord'}
          onChange={(event) => setName(event.target.value)}
        />
      </Field>

      <Field label="How often">
        <Select
          options={CADENCE_OPTIONS}
          value={cadence}
          onChange={(event) => setCadence(event.target.value as Cadence)}
        />
      </Field>

      <FieldRow>
        <Field label="Next on">
          <TextInput
            type="date"
            value={nextDate}
            onChange={(event) => setNextDate(event.target.value)}
          />
        </Field>
        <Field label="Until" hint="Optional">
          <TextInput
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
          />
        </Field>
      </FieldRow>

      {accountOptions.length > 1 ? (
        <Field label="Account">
          <Select
            options={accountOptions}
            value={accountId}
            onChange={(event) => setAccountId(event.target.value)}
          />
        </Field>
      ) : null}

      <Field label="Note">
        <TextArea rows={2} value={note} onChange={(event) => setNote(event.target.value)} />
      </Field>

      {editing ? <Switch label="Paused" checked={paused} onChange={setPaused} /> : null}

      <FormActions
        onCancel={onClose}
        onSubmit={submit}
        submitLabel={editing ? 'Save changes' : 'Add it'}
        destructive={
          editing ? (
            <button
              type="button"
              onClick={() => {
                deleteSchedule(editing.id)
                onClose()
              }}
              className="h-[38px] w-full rounded-[var(--radius-control)] text-[13px] font-semibold text-outflow"
            >
              Remove this repeat
            </button>
          ) : null
        }
      />
    </Sheet>
  )
}
