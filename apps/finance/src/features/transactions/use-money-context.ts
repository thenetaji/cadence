import { getLocales } from 'expo-localization';
import { useMemo } from 'react';

import { maskLocale } from '@studio/money';
import { useRateLookup, useSetting, useTodayKey } from '@/data/hooks';

import type { DayGroupContext } from './day-groups';
import type { RowModelContext } from './row-model';

/** Rupee users expect lakh grouping even when the device region is not India. */
export function moneyLocale(displayCurrency: string): string | undefined {
  const tag = getLocales()[0]?.languageTag;
  if (displayCurrency === 'INR' && !/-IN$/.test(tag ?? '')) return 'en-IN';
  return tag;
}

export type MoneyContext = DayGroupContext & RowModelContext;

/** Everything list rows need to format money; memoised so rows stay stable between renders. */
export function useMoneyContext(options: { relativeDays?: boolean } = {}): MoneyContext {
  const [displayCurrency] = useSetting('display_currency');
  const [showDecimals] = useSetting('show_decimals');
  const [hidden] = useSetting('hide_amounts');
  const rates = useRateLookup();
  const todayKey = useTodayKey();
  const relative = options.relativeDays ?? false;
  return useMemo(
    () => ({
      displayCurrency,
      showDecimals,
      rates,
      todayKey,
      locale: maskLocale(moneyLocale(displayCurrency), hidden),
      relativeTo: relative ? todayKey : undefined,
    }),
    [displayCurrency, showDecimals, hidden, rates, todayKey, relative],
  );
}
