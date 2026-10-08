import { and, asc, isNull, eq } from "drizzle-orm";
import { convertWithRates } from "@studio/money";
import { monthlyCost, yearlyCost } from "@/lib/recurring";
import { recurringRules, type RecurringRuleRow } from "../schema";
import type { Db } from "../types";
import { getRateLookup } from "./fx";
import { getSetting } from "./settings";

export interface Subscription {
  rule: RecurringRuleRow;
  /** Normalised cost in the rule's own currency, integer minor units. */
  monthly: number;
  yearly: number;
  /** The same two costs in the display currency (unknown rates leave amounts unconverted). */
  monthlyDisplay: number;
  yearlyDisplay: number;
  /** Date key of the next charge (the rule's `nextDue`). */
  nextCharge: string;
}

export interface SubscriptionList {
  currency: string;
  /** Biggest monthly cost first. */
  items: Subscription[];
  totals: { monthly: number; yearly: number; count: number };
}

/**
 * Active expense rules (not paused, not past their end date) as subscriptions.
 * Transfers, income and lending-style rules never appear.
 */
export function listSubscriptions(db: Db): SubscriptionList {
  const currency = getSetting(db, "display_currency");
  const rates = getRateLookup(db);
  const rules = db
    .select()
    .from(recurringRules)
    .where(
      and(eq(recurringRules.kind, "expense"), isNull(recurringRules.pausedAt)),
    )
    .orderBy(asc(recurringRules.nextDue), asc(recurringRules.createdAt))
    .all()
    .filter((rule) => rule.endDate === null || rule.nextDue <= rule.endDate);
  const items = rules
    .map((rule): Subscription => {
      const monthly = monthlyCost(rule.amount, rule.frequency, rule.interval);
      const yearly = yearlyCost(rule.amount, rule.frequency, rule.interval);
      return {
        rule,
        monthly,
        yearly,
        monthlyDisplay: convertWithRates(
          monthly,
          rule.currency,
          currency,
          rates,
        ),
        yearlyDisplay: convertWithRates(yearly, rule.currency, currency, rates),
        nextCharge: rule.nextDue,
      };
    })
    .sort(
      (a, b) =>
        b.monthlyDisplay - a.monthlyDisplay ||
        a.nextCharge.localeCompare(b.nextCharge),
    );
  return {
    currency,
    items,
    totals: {
      monthly: items.reduce((sum, i) => sum + i.monthlyDisplay, 0),
      yearly: items.reduce((sum, i) => sum + i.yearlyDisplay, 0),
      count: items.length,
    },
  };
}
