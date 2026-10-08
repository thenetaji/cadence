import { flowAmount } from "@/features/insights/labels";

/** "Aug · Spent ₹52.3K · Earned ₹1.45L". */
export function monthScrub(
  month: { income: number; spent: number },
  short: string,
  currency: string,
  locale?: string,
): string {
  return `${short} · Spent ${flowAmount(month.spent, currency, locale)} · Earned ${flowAmount(month.income, currency, locale)}`;
}
