import { desc, eq, sql } from "drizzle-orm";

import { titleMemory, type TitleMemoryRow } from "@/db/schema";
import type { Db } from "@/db/types";
import { useLiveData } from "@/data/use-live-data";

/** Most used expense titles, ranked by use count then recency. */
export function frequentTitles(db: Db, limit: number): TitleMemoryRow[] {
  return db
    .select()
    .from(titleMemory)
    .where(eq(titleMemory.kind, "expense"))
    .orderBy(
      desc(titleMemory.useCount),
      desc(titleMemory.lastUsedAt),
      sql`${titleMemory.titleNorm} asc`,
    )
    .limit(limit)
    .all();
}

export function useFrequentTitles(limit: number): TitleMemoryRow[] {
  return useLiveData(["title_memory"], `frequent:${limit}`, (db) =>
    frequentTitles(db, limit),
  );
}
