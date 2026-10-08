import { diffDays, monthShort, parseKey, type DateKey } from "@studio/dates";
import type { Frequency } from "@/lib/recurring";

const ADVERBS: Record<Frequency, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};
const UNITS: Record<Frequency, string> = {
  daily: "days",
  weekly: "weeks",
  monthly: "months",
  yearly: "years",
};

/** "Monthly", "Every 3 months". */
export function cadenceLabel(frequency: Frequency, interval: number): string {
  const n = Math.max(1, Math.trunc(interval));
  return n > 1 ? `Every ${n} ${UNITS[frequency]}` : ADVERBS[frequency];
}

/** "Today", "Tomorrow", "in 4 days" within a week, otherwise "20 Oct". Overdue shows the date. */
export function nextChargeLabel(
  nextCharge: DateKey,
  todayKey: DateKey,
): string {
  const days = diffDays(todayKey, nextCharge);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days > 1 && days <= 7) return `in ${days} days`;
  const { day, month } = parseKey(nextCharge);
  return `${day} ${monthShort(month)}`;
}
