import { getLocales } from "expo-localization";

import { getCurrency } from "@studio/money";

const EURO_REGIONS = new Set([
  "AT",
  "BE",
  "CY",
  "DE",
  "EE",
  "ES",
  "FI",
  "FR",
  "GR",
  "HR",
  "IE",
  "IT",
  "LT",
  "LU",
  "LV",
  "MT",
  "NL",
  "PT",
  "SI",
  "SK",
]);

export function defaultCurrencyCode(): string {
  const locale = getLocales()[0];
  const region = locale?.regionCode?.toUpperCase();
  if (region === "IN") return "INR";
  if (region && EURO_REGIONS.has(region)) return "EUR";
  const reported = locale?.currencyCode?.toUpperCase();
  if (reported && getCurrency(reported)) return reported;
  return "USD";
}
