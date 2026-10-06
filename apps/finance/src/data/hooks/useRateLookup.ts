import { getRateLookup } from '@/db/repos/fx';
import type { RateLookup } from '@/lib/money';
import { useLiveData } from '../use-live-data';

/** Manual exchange rates (direct or inverse); display and prefill only. */
export function useRateLookup(): RateLookup {
  return useLiveData(['fx_rates'], '', getRateLookup);
}
