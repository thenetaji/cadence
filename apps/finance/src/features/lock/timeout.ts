export type LockTimeout = 0 | 60 | 300;

export const LOCK_TIMEOUT_OPTIONS = [
  { value: 0, label: "Immediately" },
  { value: 60, label: "1 min" },
  { value: 300, label: "5 min" },
] as const satisfies readonly { value: LockTimeout; label: string }[];

export function lockTimeoutLabel(timeoutS: number): string {
  return (
    LOCK_TIMEOUT_OPTIONS.find((o) => o.value === timeoutS)?.label ??
    "Immediately"
  );
}

type ReturnDecision = {
  enabled: boolean;
  timeoutS: number;
  /** When the app reached the background, or null when it never did (an inactive blip such as Control Centre). */
  backgroundedAt: number | null;
  now: number;
};

/** True when the app returns to the foreground after being backgrounded for at least the timeout. */
export function shouldLockOnReturn({
  enabled,
  timeoutS,
  backgroundedAt,
  now,
}: ReturnDecision): boolean {
  if (!enabled || backgroundedAt === null) return false;
  return now - backgroundedAt >= timeoutS * 1000;
}
