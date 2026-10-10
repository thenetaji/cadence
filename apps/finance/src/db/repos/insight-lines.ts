import { and, between, eq, inArray } from "drizzle-orm";
import type { DetailedLine, InsightsScope } from "@/lib/insights";
import { transactionSplits, transactions } from "../schema";
import { scopeConditions } from "./reports";
import type { Db } from "../types";

/** Like `spendLines`, plus the transaction id, title and account for merchant and account breakdowns. */
export function detailedLines(
  db: Db,
  range: { from: string; to: string },
  scope?: InsightsScope,
): DetailedLine[] {
  const kinds = ["expense", "income"] as const;
  const columns = {
    transactionId: transactions.id,
    title: transactions.title,
    accountId: transactions.accountId,
    dateKey: transactions.dateKey,
    kind: transactions.kind,
    currency: transactions.currency,
  };
  const plain = db
    .select({
      ...columns,
      categoryId: transactions.categoryId,
      amount: transactions.amount,
    })
    .from(transactions)
    .where(
      and(
        between(transactions.dateKey, range.from, range.to),
        inArray(transactions.kind, [...kinds]),
        eq(transactions.isSplit, false),
        ...scopeConditions(scope),
      ),
    )
    .all();
  const split = db
    .select({
      ...columns,
      categoryId: transactionSplits.categoryId,
      amount: transactionSplits.amount,
    })
    .from(transactionSplits)
    .innerJoin(
      transactions,
      eq(transactionSplits.transactionId, transactions.id),
    )
    .where(
      and(
        between(transactions.dateKey, range.from, range.to),
        inArray(transactions.kind, [...kinds]),
        ...scopeConditions(scope),
      ),
    )
    .all();
  const lines: DetailedLine[] = [];
  for (const row of [...plain, ...split]) {
    if (row.kind !== "expense" && row.kind !== "income") continue;
    lines.push({ ...row, kind: row.kind });
  }
  return lines;
}
