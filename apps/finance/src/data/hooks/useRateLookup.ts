import { getRateLookup } from '@/db/repos/fx';
import type { RateLookup } from '@studio/money';
import { useLiveData } from '@/data/use-live-data';

/** Manual exchange rates (direct or inverse); display and prefill only. */
export function useRateLookup(): RateLookup {
  return useLiveData(['fx_rates'], '', getRateLookup);
}
