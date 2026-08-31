import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cx } from './primitives'

export const controlClass =
  'w-full rounded-[var(--radius-control)] border border-border bg-surface px-3 py-2 text-[13px] text-ink outline-none placeholder:text-ink-3 focus:border-border-strong'

export function Field({
  label,
  hint,
  problem,
  children,
}: {
  label: string
  hint?: string | undefined
  problem?: string | null | undefined
  children: ReactNode
}) {
  return (
    <label className="mb-2.5 block">
      <span className="mb-1 block text-[11px] font-medium text-ink-3">{label}</span>
      {children}
      {problem ? (
        <span className="mt-1 block text-[11.5px] text-outflow">{problem}</span>
      ) : hint ? (
        <span className="mt-1 block text-[11px] text-ink-3">{hint}</span>
      ) : null}
    </label>
  )
}

export function FieldRow({ children }: { children: ReactNode }) {
  return <div className="flex gap-2.5 [&>label]:flex-1 [&>label]:min-w-0">{children}</div>
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(controlClass, props.className)} />
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(controlClass, 'resize-none', props.className)} />
}

export function Select({
  options,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & {
  options: readonly { value: string; label: string }[]
}) {
  return (
    <select {...rest} className={cx(controlClass, 'appearance-none pr-8', rest.className)}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

/**
 * The amount, with the currency shown rather than typed. Digits get their own
 * keyboard on a phone and the field stays a text one so `1.234,56` still parses.
 */
export function AmountInput({
  currency,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { currency: string }) {
  return (
    <span className="relative block">
      <input
        {...rest}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        className={cx(controlClass, 'pr-12 text-[15px] font-semibold tabular-nums', rest.className)}
      />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[11px] font-semibold text-ink-3">
        {currency}
      </span>
    </span>
  )
}

/** A free-text name that suggests the people already on record. */
export function NameInput({
  suggestions,
  listId,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { suggestions: readonly string[]; listId: string }) {
  return (
    <>
      <input {...rest} list={listId} autoComplete="off" className={cx(controlClass, rest.className)} />
      <datalist id={listId}>
        {suggestions.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
    </>
  )
}

export function ChoiceChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={option.value === value}
          className={cx(
            'rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors duration-[140ms]',
            option.value === value
              ? 'border-ink bg-ink text-canvas'
              : 'border-border bg-surface text-ink-2 hover:bg-surface-2',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function Switch({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 py-2 text-left text-[13px]"
    >
      {label}
      <span
        className={cx(
          'relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors duration-[140ms]',
          checked ? 'bg-ink' : 'bg-surface-3',
        )}
      >
        <span
          className={cx(
            'absolute top-[3px] h-4 w-4 rounded-full bg-surface transition-all duration-[140ms]',
            checked ? 'left-[19px]' : 'left-[3px]',
          )}
        />
      </span>
    </button>
  )
}

export function FormActions({
  onCancel,
  onSubmit,
  submitLabel,
  destructive,
}: {
  onCancel: () => void
  onSubmit: () => void
  submitLabel: string
  destructive?: ReactNode
}) {
  return (
    <div className="mt-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="h-[42px] flex-1 rounded-[var(--radius-control)] border border-border-strong text-[13.5px] font-semibold text-ink"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSubmit}
          className="h-[42px] flex-[1.6] rounded-[var(--radius-control)] bg-ink text-[13.5px] font-semibold text-canvas"
        >
          {submitLabel}
        </button>
      </div>
      {destructive ? <div className="mt-2">{destructive}</div> : null}
    </div>
  )
}
