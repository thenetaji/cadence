import type { ReactNode } from 'react'
import { useRouter } from '~/lib/router'
import { ActivityIcon, IncomeIcon, OverviewIcon, PeopleIcon } from './icons'
import { cx } from './primitives'

const TABS = [
  { name: 'overview', label: 'Overview', Icon: OverviewIcon },
  { name: 'activity', label: 'Activity', Icon: ActivityIcon },
  { name: 'people', label: 'People', Icon: PeopleIcon },
  { name: 'income', label: 'Income', Icon: IncomeIcon },
] as const

export function AppShell({ children }: { children: ReactNode }) {
  const { route, navigate } = useRouter()
  const current = route.name === 'person' ? 'people' : route.name

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-5xl md:gap-6 md:px-6">
      <nav className="sticky top-0 hidden h-dvh w-52 shrink-0 flex-col gap-0.5 border-r border-border py-5 pr-3 md:flex">
        <div className="mb-4 flex items-center gap-2 px-2 text-[13.5px] font-semibold tracking-[-0.01em]">
          <span className="h-[19px] w-[19px] rounded-[6px] bg-ink" />
          Cadence
        </div>
        {TABS.map((tab) => (
          <button
            key={tab.name}
            type="button"
            onClick={() => navigate(`/${tab.name}`)}
            aria-current={current === tab.name ? 'page' : undefined}
            className={cx(
              'flex items-center gap-2.5 rounded-[var(--radius-control)] px-2.5 py-2 text-[13px] font-medium',
              current === tab.name ? 'bg-surface-2 text-ink' : 'text-ink-2 hover:bg-surface-2',
            )}
          >
            <tab.Icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="min-w-0 flex-1 px-4 pt-4 pb-24 md:px-0 md:pb-10">{children}</main>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-border bg-surface md:hidden">
        {TABS.map((tab) => (
          <button
            key={tab.name}
            type="button"
            onClick={() => navigate(`/${tab.name}`)}
            aria-current={current === tab.name ? 'page' : undefined}
            className={cx(
              'flex min-h-[54px] flex-col items-center justify-center gap-1 text-[9.5px] font-medium',
              current === tab.name ? 'text-ink' : 'text-ink-3',
            )}
          >
            <tab.Icon className="h-[19px] w-[19px]" />
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  )
}

export function PageHeader({
  title,
  subtitle,
  actions,
  onBack,
}: {
  title: string
  subtitle?: ReactNode
  actions?: ReactNode
  onBack?: () => void
}) {
  return (
    <header className="flex items-start justify-between gap-3 pb-3 pt-1">
      <div className="flex min-w-0 items-center gap-2.5">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[var(--radius-control)] border border-border text-ink-2"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
        ) : null}
        <div className="min-w-0">
          <h1 className="truncate text-[20px] font-semibold tracking-[-0.025em]">{title}</h1>
          {subtitle ? <div className="mt-px text-[11.5px] text-ink-3">{subtitle}</div> : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 gap-1.5">{actions}</div> : null}
    </header>
  )
}

export function IconButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid h-[30px] w-[30px] place-items-center rounded-[var(--radius-control)] border border-border bg-surface text-ink-2 hover:bg-surface-2"
    >
      {children}
    </button>
  )
}

export function Sheet({
  title,
  description,
  onClose,
  children,
}: {
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center md:items-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/25"
      />
      <div className="safe-bottom relative max-h-[92dvh] w-full overflow-y-auto rounded-t-[var(--radius-sheet)] border-t border-border bg-surface px-4 pt-2 pb-5 shadow-2xl md:max-w-lg md:rounded-[var(--radius-sheet)] md:border">
        <div className="mx-auto mb-3.5 h-1 w-9 rounded-full bg-border-strong md:hidden" />
        <h2 className="text-[17px] font-semibold tracking-[-0.02em]">{title}</h2>
        {description ? <p className="mt-0.5 mb-3 text-[12px] text-ink-3">{description}</p> : null}
        {children}
      </div>
    </div>
  )
}
