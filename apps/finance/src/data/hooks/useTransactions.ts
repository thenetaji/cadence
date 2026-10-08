import {
  getTransaction,
  listForPeriod,
  recent,
  type PeriodFilter,
  type TransactionListItem,
} from "@/db/repos/transactions";
import { useLiveData } from "@/data/use-live-data";

const TX_TABLES = [
  "transactions",
  "transaction_splits",
  "accounts",
  "categories",
  "tags",
  "transaction_tags",
  "people",
  "attachments",
] as const;

export function usePeriodTransactions(
  filter: PeriodFilter,
): TransactionListItem[] {
  const key = JSON.stringify([
    filter.from,
    filter.to,
    filter.kinds ?? null,
    filter.categoryId ?? null,
    filter.accountId ?? null,
    filter.tagId ?? null,
    filter.personId ?? null,
  ]);
  return useLiveData(TX_TABLES, key, (db) => listForPeriod(db, filter));
}

export function useTransaction(
  id: string | undefined,
): TransactionListItem | undefined {
  return useLiveData(TX_TABLES, id ?? "", (db) =>
    id ? getTransaction(db, id) : undefined,
  );
}

export function useRecentTransactions(limit: number): TransactionListItem[] {
  return useLiveData(TX_TABLES, String(limit), (db) => recent(db, limit));
}

export type {
  PeriodFilter,
  TransactionListItem,
} from "@/db/repos/transactions";
