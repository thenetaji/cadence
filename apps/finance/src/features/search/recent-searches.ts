export const MAX_RECENT_SEARCHES = 5;

/** Puts `term` first, drops case-insensitive duplicates, keeps the newest five. */
export function pushRecentSearch(
  list: readonly string[],
  term: string,
): string[] {
  const text = term.trim();
  if (text === "") return [...list];
  const rest = list.filter(
    (entry) => entry.toLowerCase() !== text.toLowerCase(),
  );
  return [text, ...rest].slice(0, MAX_RECENT_SEARCHES);
}
