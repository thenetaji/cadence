import {
  counterpartyKey,
  fromMinor,
  parseAmount,
  todayIso,
  toMajor,
  type Channel,
  type CounterpartyRole,
  type Transaction,
} from '@cadence/core'
import { useMemo, useState } from 'react'
import {
  AmountInput,
  ChoiceChips,
  Field,
  FieldRow,
  FormActions,
  NameInput,
  Select,
  TextArea,
  TextInput,
} from '~/components/form'
import { Banner, Button, Segmented } from '~/components/primitives'
import { Sheet } from '~/components/shell'
import { useWorkspace } from '~/lib/workspace'

type Mode = 'out' | 'in' | 'transfer'

const MODES = [
  { value: 'out', label: 'Spent' },
  { value: 'in', label: 'Received' },
  { value: 'transfer', label: 'Moved' },
] as const

const CHANNELS = [
  { value: 'card', label: 'Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'atm', label: 'ATM' },
  { value: 'fee', label: 'Fee' },
  { value: 'interest', label: 'Interest' },
  { value: 'other', label: 'Other' },
] as const satisfies readonly { value: Channel; label: string }[]

const ROLES = [
  { value: 'spending', label: 'Spending' },
  { value: 'client', label: 'Client' },
  { value: 'lent', label: 'Lent' },
  { value: 'support', label: 'Support' },
  { value: 'account', label: 'Mine' },
] as const satisfies readonly { value: CounterpartyRole; label: string }[]

export function EntrySheet({
  editing,
  initialMode = 'out',
  onClose,
}: {
  editing?: Transaction
  initialMode?: Mode
  onClose: () => void
}) {
  const {
    workspace,
    addEntry,
    editEntry,
    deleteEntry,
    transfer,
    addAccount,
    counterparty,
    money,
    fullDay,
  } = useWorkspace()

  const currency = workspace.displayCurrency
  const existingParty = editing ? counterparty(editing.counterpartyId) : undefined

  const [mode, setMode] = useState<Mode>(
    editing ? (editing.direction === 'in' ? 'in' : 'out') : initialMode,
  )
  const [amount, setAmount] = useState(editing ? String(toMajor(editing.amount)) : '')
  const [name, setName] = useState(existingParty?.displayName ?? '')
  const [role, setRole] = useState<CounterpartyRole>('spending')
  const [chosenAccountId, setAccountId] = useState(
    editing?.accountId ?? workspace.accounts[0]?.id ?? '',
  )
  const [chosenToAccountId, setToAccountId] = useState(workspace.accounts[1]?.id ?? '')
  const [date, setDate] = useState(editing?.date ?? todayIso())
  const [channel, setChannel] = useState<Channel>(editing?.channel ?? 'card')
  const [description, setDescription] = useState(editing?.description ?? '')
  const [note, setNote] = useState(editing?.note ?? '')
  const [showDetail, setShowDetail] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const names = useMemo(
    () => workspace.counterparties.map((entry) => entry.displayName).sort(),
    [workspace.counterparties],
  )
  const accountOptions = useMemo(
    () => workspace.accounts.map((entry) => ({ value: entry.id, label: entry.label })),
    [workspace.accounts],
  )
  const isNewName = name.trim() !== '' && !workspace.counterparties.some(
    (entry) => entry.id === counterpartyKey(name.trim()),
  )

  // The sheet can be open while the first account is created, so a chosen account
  // that is not there yet — or any longer — falls back rather than failing on save.
  const known = (id: string) => workspace.accounts.some((entry) => entry.id === id)
  const accountId = known(chosenAccountId) ? chosenAccountId : (workspace.accounts[0]?.id ?? '')
  const toAccountId = known(chosenToAccountId) && chosenToAccountId !== accountId
    ? chosenToAccountId
    : (workspace.accounts.find((entry) => entry.id !== accountId)?.id ?? '')

  if (workspace.accounts.length === 0) {
    return (
      <Sheet
        title="An account first"
        description="Every entry belongs somewhere. Start with the one you spend from."
        onClose={onClose}
      >
        <Banner>
          Cadence has no account to record against yet. Adding one called Cash takes a second and
          you can rename it, or set its balance, in Settings.
        </Banner>
        <Button
          className="mt-3 w-full"
          onClick={() => addAccount('Cash', fromMinor(0, currency))}
        >
          Add a Cash account
        </Button>
        <Button variant="ghost" className="mt-2 w-full" onClick={onClose}>
          Not now
        </Button>
      </Sheet>
    )
  }

  const readAmount = () => {
    try {
      const value = parseAmount(amount, currency)
      if (value.minor <= 0) {
        setProblem('The amount has to be more than zero.')
        return null
      }
      return value
    } catch {
      setProblem('That amount could not be read.')
      return null
    }
  }

  const submit = () => {
    const value = readAmount()
    if (value === null) return

    try {
      if (mode === 'transfer') {
        if (workspace.accounts.length < 2) {
          setProblem('A move needs a second account. Add one in Settings.')
          return
        }
        transfer({
          fromAccountId: accountId,
          toAccountId,
          date,
          amount: value,
          note,
        })
        onClose()
        return
      }

      if (name.trim() === '') {
        setProblem(mode === 'in' ? 'Who did the money come from?' : 'Who did the money go to?')
        return
      }

      if (editing) {
        editEntry(editing.id, {
          accountId,
          date,
          direction: mode,
          amount: value,
          counterpartyName: name.trim(),
          channel,
          description: description.trim() === '' ? name.trim() : description.trim(),
          note,
        })
      } else {
        addEntry({
          accountId,
          date,
          direction: mode,
          amount: value,
          counterpartyName: name.trim(),
          ...(isNewName ? { role } : {}),
          channel,
          description: description.trim() === '' ? name.trim() : description.trim(),
          note,
          reference: '',
        })
      }
      onClose()
    } catch (error) {
      setProblem(error instanceof Error ? error.message : 'That could not be saved.')
    }
  }

  if (confirmingDelete && editing) {
    return (
      <Sheet title="Delete this entry" onClose={() => setConfirmingDelete(false)}>
        <Banner tone="warn">
          {money(editing.amount)} on {fullDay(editing.date)}
          {editing.transferId ? ' — both sides of the move go together.' : '.'} Undo is on the
          Activity screen if you change your mind.
        </Banner>
        <FormActions
          onCancel={() => setConfirmingDelete(false)}
          onSubmit={() => {
            deleteEntry(editing.id)
            onClose()
          }}
          submitLabel="Delete"
        />
      </Sheet>
    )
  }

  if (editing && editing.transferId !== null) {
    return (
      <Sheet
        title="A move between your accounts"
        description="Both sides have to agree, so the amount and the date are fixed once recorded."
        onClose={onClose}
      >
        <div className="rounded-[var(--radius-card)] border border-border bg-surface-2 px-3.5 py-3">
          <div className="text-[15px] font-semibold">{money(editing.amount)}</div>
          <div className="mt-0.5 text-[12px] text-ink-3">
            {editing.description} · {fullDay(editing.date)}
          </div>
        </div>
        <div className="mt-3">
          <Field label="Note">
            <TextArea
              rows={2}
              value={note}
              placeholder="Anything worth remembering"
              onChange={(event) => setNote(event.target.value)}
            />
          </Field>
        </div>
        <FormActions
          onCancel={onClose}
          onSubmit={() => {
            editEntry(editing.id, { note })
            onClose()
          }}
          submitLabel="Save note"
          destructive={
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="h-[38px] w-full rounded-[var(--radius-control)] text-[13px] font-semibold text-outflow"
            >
              Delete both sides of this move
            </button>
          }
        />
      </Sheet>
    )
  }

  const title = editing ? 'Edit entry' : mode === 'transfer' ? 'Move money' : 'New entry'

  return (
    <Sheet
      title={title}
      description={editing?.source === 'imported' ? 'This row came from a statement.' : undefined}
      onClose={onClose}
    >
      {editing ? null : (
        <div className="mb-3">
          <Segmented
            options={MODES}
            value={mode}
            onChange={(next) => {
              setMode(next)
              setChannel(next === 'out' ? 'card' : 'transfer')
              setProblem(null)
            }}
          />
        </div>
      )}

      <Field label="Amount" problem={problem}>
        <AmountInput
          currency={currency}
          value={amount}
          autoFocus
          placeholder="0.00"
          onChange={(event) => {
            setAmount(event.target.value)
            setProblem(null)
          }}
        />
      </Field>

      {mode === 'transfer' ? (
        <FieldRow>
          <Field label="From">
            <Select
              options={accountOptions}
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
            />
          </Field>
          <Field label="To">
            <Select
              options={accountOptions.filter((option) => option.value !== accountId)}
              value={toAccountId}
              onChange={(event) => setToAccountId(event.target.value)}
            />
          </Field>
        </FieldRow>
      ) : (
        <Field
          label={mode === 'in' ? 'From' : 'To'}
          hint={isNewName ? 'A new name — give it a label below.' : undefined}
        >
          <NameInput
            listId="known-names"
            suggestions={names}
            value={name}
            placeholder={mode === 'in' ? 'Northwind Studio' : 'Corner Market'}
            onChange={(event) => {
              setName(event.target.value)
              setProblem(null)
            }}
          />
        </Field>
      )}

      {isNewName && mode !== 'transfer' ? (
        <Field label="Label" hint="What this name means. It decides which totals it lands in.">
          <ChoiceChips options={ROLES} value={role} onChange={setRole} />
        </Field>
      ) : null}

      <FieldRow>
        <Field label="Date">
          <TextInput type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </Field>
        {mode === 'transfer' || accountOptions.length < 2 ? null : (
          <Field label="Account">
            <Select
              options={accountOptions}
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
            />
          </Field>
        )}
      </FieldRow>

      {showDetail ? (
        <>
          {mode === 'transfer' ? null : (
            <>
              <Field label="How">
                <ChoiceChips options={CHANNELS} value={channel} onChange={setChannel} />
              </Field>
              <Field label="Description" hint="Left blank, the name is used.">
                <TextInput
                  value={description}
                  placeholder={name || 'Groceries'}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </Field>
            </>
          )}
          <Field label="Note">
            <TextArea
              rows={2}
              value={note}
              placeholder="Anything worth remembering"
              onChange={(event) => setNote(event.target.value)}
            />
          </Field>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setShowDetail(true)}
          className="mb-1 text-[12px] font-semibold text-ink-2 underline underline-offset-2"
        >
          More detail
        </button>
      )}

      <FormActions
        onCancel={onClose}
        onSubmit={submit}
        submitLabel={editing ? 'Save changes' : mode === 'transfer' ? 'Record the move' : 'Add entry'}
        destructive={
          editing ? (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="h-[38px] w-full rounded-[var(--radius-control)] text-[13px] font-semibold text-outflow"
            >
              Delete this entry
            </button>
          ) : null
        }
      />
    </Sheet>
  )
}
