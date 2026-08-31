import type { ButtonHTMLAttributes, ReactNode } from 'react'

export function cx(...values: (string | false | null | undefined)[]): string {
  return values.filter(Boolean).join(' ')
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cx(
        'rounded-[var(--radius-card)] border border-border bg-surface p-4',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function SectionHeading({ title, aside }: { title: string; aside?: ReactNode }) {
  return (
    <div className="mb-2 flex items-baseline justify-between">
      <h2 className="text-[12.5px] font-semibold">{title}</h2>
      {aside ? <span className="text-[11px] text-ink-3">{aside}</span> : null}
    </div>
  )
}

export function StatTile({
  label,
  value,
  detail,
  marker,
}: {
  label: string
  value: string
  detail?: ReactNode
  marker?: 'inflow' | 'outflow' | 'held'
}) {
  const markerColor =
    marker === 'inflow'
      ? 'bg-inflow'
      : marker === 'outflow'
        ? 'bg-outflow'
        : marker === 'held'
          ? 'bg-held'
          : ''
  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface px-3.5 py-3">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-ink-3">
        {marker ? <span className={cx('h-[7px] w-[7px] rounded-[2px]', markerColor)} /> : null}
        {label}
      </div>
      <div className="mt-1.5 text-[17px] font-semibold tracking-[-0.025em]">{value}</div>
      {detail ? <div className="mt-0.5 text-[11px] text-ink-3">{detail}</div> : null}
    </div>
  )
}

export function Hero({
  label,
  value,
  meta,
}: {
  label: string
  value: string
  meta?: ReactNode
}) {
  return (
    <div className="pb-3.5">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-ink-3">
        {label}
      </div>
      <div className="mt-1 text-[clamp(28px,8vw,33px)] font-semibold leading-[1.08] tracking-[-0.035em]">
        {value}
      </div>
      {meta ? <div className="mt-1.5 text-[12px] text-ink-2">{meta}</div> : null}
    </div>
  )
}

export function ListRow({
  leading,
  title,
  subtitle,
  trailing,
  onClick,
}: {
  leading?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  trailing?: ReactNode
  onClick?: (() => void) | undefined
}) {
  const content = (
    <>
      {leading}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium">{title}</div>
        {subtitle ? <div className="mt-px truncate text-[11px] text-ink-3">{subtitle}</div> : null}
      </div>
      {trailing}
    </>
  )

  if (!onClick) {
    return (
      <div className="flex items-center gap-2.5 border-b border-border py-2.5 last:border-0">
        {content}
      </div>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 border-b border-border py-2.5 text-left last:border-0 hover:bg-surface-2 focus-visible:bg-surface-2"
    >
      {content}
    </button>
  )
}

export function Initials({ name }: { name: string }) {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-surface-2 text-[11.5px] font-semibold text-ink-2">
      {letters || '—'}
    </span>
  )
}

export function Amount({ text, tone }: { text: string; tone: 'in' | 'out' | 'flat' }) {
  const color = tone === 'in' ? 'text-inflow' : tone === 'flat' ? 'text-ink-3' : 'text-ink'
  return <span className={cx('shrink-0 text-[13px] font-semibold', color)}>{text}</span>
}

export function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block rounded-full border border-border bg-surface-2 px-2 py-px text-[10px] font-semibold text-ink-2">
      {children}
    </span>
  )
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'solid' | 'ghost' }

export function Button({ variant = 'solid', className, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      className={cx(
        'inline-flex h-[38px] items-center justify-center gap-2 rounded-[var(--radius-control)] px-4 text-[13.5px] font-semibold transition-colors duration-[140ms] disabled:opacity-40',
        variant === 'solid'
          ? 'bg-ink text-canvas hover:opacity-90'
          : 'border border-border-strong bg-transparent text-ink hover:bg-surface-2',
        className,
      )}
    />
  )
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="flex gap-0.5 rounded-[9px] bg-surface-2 p-[2.5px]">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={option.value === value}
          className={cx(
            'flex-1 rounded-[7px] py-1.5 text-[11.5px] font-semibold transition-colors duration-[140ms]',
            option.value === value ? 'bg-surface text-ink shadow-sm' : 'text-ink-3',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function Note({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-border border-l-2 border-l-ink bg-surface px-3.5 py-3 text-[12.5px] text-ink-2">
      {children}
    </div>
  )
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string
  body: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col justify-center px-2 py-16">
      <div className="mb-4 h-10 w-10 rounded-[11px] bg-ink" />
      <h2 className="text-[21px] font-semibold tracking-[-0.025em]">{title}</h2>
      <p className="mt-1.5 mb-5 text-[13.5px] leading-relaxed text-ink-2">{body}</p>
      {action}
    </div>
  )
}
