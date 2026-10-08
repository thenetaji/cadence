/** Point at fraction `t` (0-1 of total length) along a polyline. Worklet-safe, pure. */
export type PolyPath = { xs: number[]; ys: number[]; cum: number[] };

export function buildPolyPath(
  points: readonly { x: number; y: number }[],
): PolyPath {
  const xs: number[] = [];
  const ys: number[] = [];
  const cum: number[] = [];
  let total = 0;
  points.forEach((p, i) => {
    if (i > 0) total += Math.hypot(p.x - xs[i - 1]!, p.y - ys[i - 1]!);
    xs.push(p.x);
    ys.push(p.y);
    cum.push(total);
  });
  return { xs, ys, cum };
}

export function pointAt(path: PolyPath, t: number): { x: number; y: number } {
  "worklet";
  const n = path.xs.length;
  if (n === 0) return { x: 0, y: 0 };
  const total = path.cum[n - 1]!;
  if (n === 1 || total === 0) return { x: path.xs[0]!, y: path.ys[0]! };
  const d = Math.min(1, Math.max(0, t)) * total;
  let i = 1;
  while (i < n - 1 && path.cum[i]! < d) i++;
  const span = path.cum[i]! - path.cum[i - 1]!;
  const f = span === 0 ? 0 : (d - path.cum[i - 1]!) / span;
  return {
    x: path.xs[i - 1]! + (path.xs[i]! - path.xs[i - 1]!) * f,
    y: path.ys[i - 1]! + (path.ys[i]! - path.ys[i - 1]!) * f,
  };
}
