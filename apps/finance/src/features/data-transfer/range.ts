import { customPeriod, periodFor, type DateKey, type PeriodSettings } from '@studio/dates';

export type ExportRange = 'month' | 'year' | 'all' | 'custom';

export interface DateBounds {
  from?: DateKey;
  to?: DateKey;
}

/** Inclusive day bounds for an export range; empty for All. A reversed custom range is swapped. */
export function exportBounds(range: ExportRange, today: DateKey, custom: { from: DateKey; to: DateKey }, settings: PeriodSettings): DateBounds {
  if (range === 'all') return {};
  if (range === 'custom') {
    const { from, to } = customPeriod(custom.from, custom.to);
    return { from, to };
  }
  const { from, to } = periodFor(range, today, settings);
  return { from, to };
}
