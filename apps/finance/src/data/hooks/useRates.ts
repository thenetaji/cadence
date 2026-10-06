import { listRates } from '@/db/repos/fx';
import type { FxRateRow } from '@/db/schema';
import { useLiveData } from '@/data/use-live-data';

/** Stored manual exchange rates with their update times. */
export function useRates(): FxRateRow[] {
  return useLiveData(['fx_rates'], '', listRates);
}
