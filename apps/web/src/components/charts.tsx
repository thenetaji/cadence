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

export interface TrendPoint {
  key: string
  label: string
  value: number
  /** Days something committed lands on, drawn as a tick under the line. */
  marked?: boolean
}

const TREND_HEIGHT = 96

/**
 * One series over time. A single line needs no legend — the heading names it — so
 * the only colour here is the sign of the number: below zero is drawn as an outflow.
 */
export function TrendLine({
  data,
  format,
  caption,
}: {
  data: readonly TrendPoint[]
  format: (value: number) => string
  caption?: string
}) {
  const [index, setIndex] = useState<number | null>(null)
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null)

  if (data.length < 2) return null

  const values = data.map((entry) => entry.value)
  const high = Math.max(...values, 0)
  const low = Math.min(...values, 0)
  const span = high - low || 1

  const x = (position: number) => (position / (data.length - 1)) * 100
  const y = (value: number) => ((high - value) / span) * 100

  const line = data.map((entry, position) => `${x(position)},${y(entry.value)}`).join(' ')
  const area = `${line} ${x(data.length - 1)},${y(Math.max(low, 0))} 0,${y(Math.max(low, 0))}`
  const zeroY = y(0)
  const active = index === null ? null : data[index]
  const negative = low < 0

  const track = (event: { currentTarget: HTMLElement; clientX: number; clientY: number }) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    const share = (event.clientX - bounds.left) / bounds.width
    const position = Math.round(share * (data.length - 1))
    setIndex(Math.min(data.length - 1, Math.max(0, position)))
    setPointer({ x: event.clientX, y: event.clientY })
  }

  return (
    <figure className="m-0">
      <figcaption className="sr-only">{caption ?? 'Projected balance over time'}</figcaption>
      <div
        className="relative"
        style={{ height: TREND_HEIGHT }}
        onMouseMove={track}
        onMouseLeave={() => {
          setIndex(null)
          setPointer(null)
        }}
      >
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full overflow-visible"
          aria-hidden="true"
        >
          <polygon points={area} className="fill-ink opacity-[0.06]" />
          {negative ? (
            <line
              x1="0"
              x2="100"
              y1={zeroY}
              y2={zeroY}
              className="stroke-outflow"
              strokeWidth={1}
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
          <polyline
            points={line}
            fill="none"
            className={negative ? 'stroke-outflow' : 'stroke-ink'}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          {data.map((entry, position) =>
            entry.marked ? (
              <line
                key={entry.key}
                x1={x(position)}
                x2={x(position)}
                y1={y(entry.value)}
                y2="100"
                className="stroke-border-strong"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            ) : null,
          )}
        </svg>

        {active && index !== null ? (
          <span
            className="pointer-events-none absolute z-10 h-[9px] w-[9px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-ink"
            style={{ left: `${x(index)}%`, top: `${y(active.value)}%` }}
          />
        ) : null}
      </div>

      <div className="mt-1.5 flex justify-between text-[10px] text-ink-3">
        <span>{data[0]?.label}</span>
        <span>{data.at(-1)?.label}</span>
      </div>

      {pointer && active ? (
        <Tooltip x={pointer.x} y={pointer.y}>
          <div className="font-semibold">{format(active.value)}</div>
          <div className="text-ink-2">{active.label}</div>
        </Tooltip>
      ) : null}
    </figure>
  )
}
