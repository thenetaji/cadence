/** Smooth monotone curve maths shared by the cumulative charts. */

export type Pt = readonly [number, number];
/** Cubic segment: control 1, control 2, end. */
export type Segment = readonly [number, number, number, number, number, number];

/** Fritsch-Carlson monotone cubic: smooth, never overshoots the data. Returns one segment per gap. */
export function monotoneSegments(pts: readonly Pt[]): Segment[] {
  const n = pts.length;
  if (n < 2) return [];
  const dx: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1]![0] - pts[i]![0];
    m[i] = dx[i]! === 0 ? 0 : (pts[i + 1]![1] - pts[i]![1]) / dx[i]!;
  }
  const t: number[] = [m[0]!];
  for (let i = 1; i < n - 1; i++)
    t[i] = m[i - 1]! * m[i]! <= 0 ? 0 : (m[i - 1]! + m[i]!) / 2;
  t[n - 1] = m[n - 2]!;
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      t[i] = 0;
      t[i + 1] = 0;
      continue;
    }
    const a = t[i]! / m[i]!;
    const b = t[i + 1]! / m[i]!;
    const s = a * a + b * b;
    if (s > 9) {
      const k = 3 / Math.sqrt(s);
      t[i] = k * a * m[i]!;
      t[i + 1] = k * b * m[i]!;
    }
  }
  return pts.slice(0, -1).map((p, i) => {
    const q = pts[i + 1]!;
    const h = dx[i]! / 3;
    return [
      p[0] + h,
      p[1] + t[i]! * h,
      q[0] - h,
      q[1] - t[i + 1]! * h,
      q[0],
      q[1],
    ] as const;
  });
}
