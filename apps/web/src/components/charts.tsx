import { useState } from 'react'
import type { ReactNode } from 'react'

const GRID_LINES = 3
const PLOT_HEIGHT = 88

export interface PairedBar {
  key: string
  label: string
  inflow: number
  outflow: number
  caption?: string
}

interface Pointer {
  key: string
  x: number
  y: number
}

function Tooltip({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return (
    <div
      role="status"
      className="pointer-events-none fixed z-50 max-w-[220px] rounded-[9px] border border-border bg-surface px-2.5 py-2 text-[12px] shadow-lg"
      style={{ left: Math.min(x + 12, window.innerWidth - 230), top: Math.max(y - 76, 8) }}
    >
      {children}
    </div>
  )
}

export function PairedBars({
  data,
  labels,
  format,
}: {
  data: readonly PairedBar[]
  labels: { inflow: string; outflow: string }
  format: (value: number) => string
}) {
  const [pointer, setPointer] = useState<Pointer | null>(null)

  if (data.length === 0) return null

  const peak = Math.max(...data.map((entry) => Math.max(entry.inflow, entry.outflow)), 1)
  const active = data.find((entry) => entry.key === pointer?.key)

  return (
    <figure className="m-0" onMouseLeave={() => setPointer(null)}>
      <figcaption className="sr-only">
        {labels.inflow} and {labels.outflow} for each of the last {data.length} months
      </figcaption>
      <div className="relative" style={{ height: PLOT_HEIGHT }}>
        {Array.from({ length: GRID_LINES + 1 }, (_, index) => (
          <div
            key={index}
            className="absolute inset-x-0 border-t border-border"
            style={{ top: (PLOT_HEIGHT * index) / GRID_LINES }}
          />
        ))}
        <div className="absolute inset-0 flex items-end gap-1">
          {data.map((entry) => (
            <div
              key={entry.key}
              className="flex h-full flex-1 items-end justify-center gap-0.5"
              onMouseMove={(event) =>
                setPointer({ key: entry.key, x: event.clientX, y: event.clientY })
              }
            >
              <Bar value={entry.inflow} peak={peak} tone="bg-inflow" />
              <Bar value={entry.outflow} peak={peak} tone="bg-outflow" />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-1.5 flex gap-1">
        {data.map((entry) => (
          <div key={entry.key} className="flex-1 text-center">
            <div className="text-[10px] text-ink-3">{entry.label}</div>
            {entry.caption ? (
              <div className="text-[9.5px] text-ink-3 opacity-75">{entry.caption}</div>
            ) : null}
          </div>
        ))}
      </div>
      {pointer && active ? (
        <Tooltip x={pointer.x} y={pointer.y}>
          <div className="font-semibold">{active.label}</div>
          <div className="text-ink-2">
            {labels.inflow} {format(active.inflow)}
          </div>
          <div className="text-ink-2">
            {labels.outflow} {format(active.outflow)}
          </div>
        </Tooltip>
      ) : null}
    </figure>
  )
}

function Bar({ value, peak, tone }: { value: number; peak: number; tone: string }) {
  if (value <= 0) return <span className="w-full max-w-[18px] md:max-w-[30px]" />
  return (
    <span
      className={`w-full max-w-[18px] md:max-w-[30px] rounded-t-[3px] ${tone}`}
      style={{ height: `${Math.max(1.5, (value / peak) * 100)}%` }}
    />
  )
}

export interface RankedBar {
  key: string
  label: string
  value: number
  display: string
}

export function RankedBars({
  data,
  tone,
  onSelect,
}: {
  data: readonly RankedBar[]
  tone: 'inflow' | 'outflow' | 'held'
  onSelect?: ((key: string) => void) | undefined
}) {
  if (data.length === 0) return null
  const peak = Math.max(...data.map((entry) => entry.value), 1)
  const fill = tone === 'inflow' ? 'bg-inflow' : tone === 'held' ? 'bg-held' : 'bg-outflow'

  return (
    <ul className="flex flex-col gap-1">
      {data.map((entry) => (
        <li key={entry.key}>
          <button
            type="button"
            disabled={!onSelect}
            onClick={() => onSelect?.(entry.key)}
            className="flex w-full items-center gap-2.5 rounded-[6px] py-1.5 text-left enabled:hover:bg-surface-2"
          >
            <span className="w-[84px] shrink-0 truncate text-[12px] text-ink-2">{entry.label}</span>
            <span className="h-[15px] flex-1">
              <span
                className={`block h-[15px] rounded-[4px] ${fill}`}
                style={{ width: `${Math.max(2, (entry.value / peak) * 100)}%` }}
              />
            </span>
            <span className="w-[76px] shrink-0 text-right text-[11.5px] font-semibold">
              {entry.display}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
