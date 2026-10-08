import { search, type TransactionListItem } from "@/db/repos/transactions";
import { useLiveData } from "@/data/use-live-data";

/** Title/memo/amount/tag/person search across all time; at most 200 rows, newest first. */
export function useSearchTransactions(query: string): TransactionListItem[] {
  const text = query.trim();
  return useLiveData(
    [
      "transactions",
      "transaction_splits",
      "accounts",
      "categories",
      "tags",
      "transaction_tags",
      "people",
      "attachments",
    ],
    text,
    (db) => search(db, text),
  );
}
