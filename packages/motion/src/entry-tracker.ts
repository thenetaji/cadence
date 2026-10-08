/**
 * Decides which list rows animate. Rows animate only when they genuinely appear:
 *  - the first batch of ids (screen open) staggers in, capped, so long lists never wait;
 *  - ids that show up later (a save, an undo) are an "insert": spring in plus a shimmer;
 *  - a bulk change (filter, period) animates nothing, and neither does scrolling or recycling.
 * Pure and framework-free so it can be unit-tested.
 */
export type RowEntry = { kind: "stagger"; index: number } | { kind: "insert" };

export class EntryTracker {
  private known: Set<string> | null = null;
  private pending = new Map<string, RowEntry>();

  constructor(
    private readonly cap = 10,
    /** More new ids than this at once is a reload, not an insert. */
    private readonly maxInsert = 2,
  ) {}

  sync(ids: readonly string[]): void {
    if (this.known === null || this.known.size === 0) {
      // Also covers data that arrives after an empty first render.
      ids
        .slice(0, this.cap)
        .forEach((id, index) =>
          this.pending.set(id, { kind: "stagger", index }),
        );
    } else {
      const fresh = ids.filter((id) => !this.known!.has(id));
      if (fresh.length > 0 && fresh.length <= this.maxInsert)
        fresh.forEach((id) => this.pending.set(id, { kind: "insert" }));
    }
    if (ids.length > 0 || this.known !== null) this.known = new Set(ids);
  }

  /** Non-destructive, safe to call during render. */
  peek(id: string): RowEntry | undefined {
    return this.pending.get(id);
  }

  /** Call from an effect once the row has mounted so recycled views never replay it. */
  consume(id: string): void {
    this.pending.delete(id);
  }
}
