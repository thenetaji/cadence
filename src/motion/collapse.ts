/**
 * Lets a deletion that did not start on the row (context menu, detail screen) still collapse
 * the visible row first. Rows register a collapse runner by id; callers wrap their delete.
 */
/** `commit` performs the real delete; returning false means nothing was deleted, so the row expands back. */
type Runner = (commit: () => boolean | void) => void;

const runners = new Map<string, Runner>();

export function registerCollapse(id: string, runner: Runner): () => void {
  runners.set(id, runner);
  return () => {
    if (runners.get(id) === runner) runners.delete(id);
  };
}

/** Runs `action` after the row for `id` has collapsed, or straight away if none is on screen. */
export function collapseThen(id: string, action: () => boolean | void): boolean | void {
  const runner = runners.get(id);
  if (!runner) return action();
  runners.delete(id);
  runner(action);
  return true;
}
