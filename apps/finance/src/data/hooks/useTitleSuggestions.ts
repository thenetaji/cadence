import { suggest } from "@/db/repos/titleMemory";
import type { CategoryKind, TitleMemoryRow } from "@/db/schema";
import { useLiveData } from "@/data/use-live-data";

export function useTitleSuggestions(
  text: string,
  kind: CategoryKind,
): TitleMemoryRow[] {
  return useLiveData(["title_memory"], `${kind}:${text}`, (db) =>
    suggest(db, text, kind),
  );
}
