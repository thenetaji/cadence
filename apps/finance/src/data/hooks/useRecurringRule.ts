import { getRule } from "@/db/repos/recurring";
import type { RecurringRuleRow } from "@/db/schema";
import { useLiveData } from "@/data/use-live-data";

export function useRecurringRule(
  id: string | null | undefined,
): RecurringRuleRow | undefined {
  return useLiveData(["recurring_rules"], id ?? "", (db) =>
    id ? getRule(db, id) : undefined,
  );
}
