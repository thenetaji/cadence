const pad = (n: number) => String(n).padStart(2, "0");

/** `HH:MM` as a Date today at that time. Falls back to 21:00 for bad input. */
export function fromTime(time: string): Date {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  const d = new Date();
  d.setHours(match ? Number(match[1]) : 21, match ? Number(match[2]) : 0, 0, 0);
  return d;
}

export function toTime(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
