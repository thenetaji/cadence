/**
 * Entrances play once per app session per screen. A screen that remounts (stack re-creation, a
 * navigator rebuild) must not replay its choreography, and nothing may start hidden on a revisit.
 */
const played = new Set<string>();

/** True the first time `key` is claimed this session, false afterwards. */
export function claimEntrance(key: string): boolean {
  if (played.has(key)) return false;
  played.add(key);
  return true;
}

export function resetEntrances(): void {
  played.clear();
}
