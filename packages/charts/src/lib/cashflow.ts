/** Pure geometry for the cash-flow charts: cumulative duo lines, the gap between them, and diverging bars. */
import { monotoneSegments, type Pt } from "./smooth";
import { barDomain, niceTicks } from "./geometry";

export interface DuoPoint {
  /** Cumulative money in; null after today. */
  in: number | null;
  /** Cumulative money out; null after today. */
  out: number | null;
}

/** Running sum of `daily`; entries after `todayIndex` are null. */
export function cumulativeUntil(
  daily: readonly number[],
  todayIndex: number,
): (number | null)[] {
  let sum = 0;
  return daily.map((v, i) => {
    sum += v;
    return i <= todayIndex ? sum : null;
  });
}

/** Both cumulative series for a period; the future is left empty. */
export function buildDuo(
  inDaily: readonly number[],
  outDaily: readonly number[],
  todayIndex: number,
): DuoPoint[] {
  const days = Math.max(inDaily.length, outDaily.length);
  const pad = (list: readonly number[]) =>
    Array.from({ length: days }, (_, i) => list[i] ?? 0);
  const a = cumulativeUntil(pad(inDaily), todayIndex);
  const b = cumulativeUntil(pad(outDaily), todayIndex);
  return a.map((v, i) => ({ in: v, out: b[i] ?? null }));
}

export interface DuoGeometry {
  /** Stepped polyline for money in (jumps land on their day). */
  inLine: Pt[];
  /** Day points for money out; smooth it with `monotoneSegments`. */
  outLine: Pt[];
  inEnd: Pt | null;
  outEnd: Pt | null;
  /** Shared axis maximum (minor units). */
  max: number;
  hasIncome: boolean;
  /** x of day index `i` (the end of that day). */
  xAt: (i: number) => number;
  yAt: (value: number) => number;
}

export interface DuoOptions {
  padTop?: number;
  padBottom?: number;
  /** Horizontal run of a salary jump, pt. */
  ramp?: number;
}

/**
 * Both lines on ONE shared axis. Each starts at (0, baseline); day i of N sits at x = (i + 1) / N * width. Money in
 * holds flat and climbs steeply on the day a lump lands; money out connects its day points.
 */
export function duoGeometry(
  series: readonly DuoPoint[],
  width: number,
  height: number,
  options: DuoOptions = {},
): DuoGeometry {
  const { padTop = 6, padBottom = 4, ramp = 5 } = options;
  const days = series.length;
  const peak = series.reduce((m, d) => Math.max(m, d.in ?? 0, d.out ?? 0), 0);
  const max = peak * 1.08;
  const baseline = height - padBottom;
  const yAt = (v: number) =>
    max <= 0 ? baseline : padTop + (baseline - padTop) * (1 - v / max);
  const xAt = (i: number) => (days === 0 ? 0 : ((i + 1) / days) * width);
  const empty = {
    inLine: [],
    outLine: [],
    inEnd: null,
    outEnd: null,
    max,
    hasIncome: false,
    xAt,
    yAt,
  } satisfies DuoGeometry;
  if (days === 0 || peak <= 0 || width <= 0) return empty;

  const dx = width / days;
  const r = Math.min(ramp, dx * 0.45);
  const inLine: Pt[] = [[0, yAt(0)]];
  const outLine: Pt[] = [[0, yAt(0)]];
  let prevIn = 0;
  series.forEach((d, i) => {
    const x = xAt(i);
    if (d.in !== null) {
      if (d.in !== prevIn) inLine.push([x - r, yAt(prevIn)]);
      inLine.push([x, yAt(d.in)]);
      prevIn = d.in;
    }
    // Out never sits on the baseline: a 2pt floor keeps a tiny total visible.
    if (d.out !== null) outLine.push([x, Math.min(yAt(d.out), baseline - 1.5)]);
  });
  return {
    inLine,
    outLine,
    inEnd: inLine.length > 1 ? inLine[inLine.length - 1]! : null,
    outEnd: outLine.length > 1 ? outLine[outLine.length - 1]! : null,
    max,
    hasIncome: series.some((d) => (d.in ?? 0) > 0),
    xAt,
    yAt,
  };
}

/** The smooth out-line sampled into a dense polyline (for the gap fill and the comet). */
export function sampleSmooth(pts: readonly Pt[], steps = 6): Pt[] {
  if (pts.length < 2) return [...pts];
  const out: Pt[] = [pts[0]!];
  let [px, py] = pts[0]!;
  for (const [c1x, c1y, c2x, c2y, x, y] of monotoneSegments(pts)) {
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      const u = 1 - t;
      out.push([
        u * u * u * px +
          3 * u * u * t * c1x +
          3 * u * t * t * c2x +
          t * t * t * x,
        u * u * u * py +
          3 * u * u * t * c1y +
          3 * u * t * t * c2y +
          t * t * t * y,
      ]);
    }
    px = x;
    py = y;
  }
  return out;
}

/** Linear interpolation of a polyline (increasing x) at `x`. */
export function yOnLine(line: readonly Pt[], x: number): number {
  if (line.length === 0) return 0;
  if (x <= line[0]![0]) return line[0]![1];
  for (let i = 1; i < line.length; i++) {
    const [x1, y1] = line[i]!;
    if (x <= x1) {
      const [x0, y0] = line[i - 1]!;
      return x1 === x0 ? y1 : y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return line[line.length - 1]![1];
}

export interface GapSegment {
  /** 'in' where money in is above money out (kept), 'out' where spending leads (overspent). */
  kind: "in" | "out";
  /** Closed polygon between the two lines. */
  polygon: Pt[];
}

/**
 * Regions between two polylines (pixel y, so smaller y is higher), split wherever they cross. Zero-area slivers are
 * dropped.
 */
export function gapSegments(
  inLine: readonly Pt[],
  outLine: readonly Pt[],
): GapSegment[] {
  if (inLine.length < 2 || outLine.length < 2) return [];
  const end = Math.min(
    inLine[inLine.length - 1]![0],
    outLine[outLine.length - 1]![0],
  );
  const xs = [
    ...new Set([...inLine.map((p) => p[0]), ...outLine.map((p) => p[0])]),
  ]
    .filter((x) => x <= end)
    .sort((a, b) => a - b);
  type Row = { x: number; a: number; b: number; s: number };
  const rows: Row[] = [];
  for (const x of xs) {
    const a = yOnLine(inLine, x);
    const b = yOnLine(outLine, x);
    const s = Math.abs(b - a) < 1e-9 ? 0 : Math.sign(b - a);
    const prev = rows[rows.length - 1];
    if (prev && prev.s * s < 0) {
      const t = (prev.b - prev.a) / (prev.b - prev.a - (b - a));
      const y = prev.a + (a - prev.a) * t;
      rows.push({ x: prev.x + (x - prev.x) * t, a: y, b: y, s: 0 });
    }
    rows.push({ x, a, b, s });
  }
  const segments: GapSegment[] = [];
  let run: { kind: "in" | "out"; pts: Row[] } | null = null;
  const flush = () => {
    if (
      run &&
      run.pts.length > 1 &&
      run.pts.some((p) => Math.abs(p.a - p.b) > 0.25)
    ) {
      segments.push({
        kind: run.kind,
        polygon: [
          ...run.pts.map((p) => [p.x, Math.min(p.a, p.b)] as const),
          ...[...run.pts]
            .reverse()
            .map((p) => [p.x, Math.max(p.a, p.b)] as const),
        ],
      });
    }
    run = null;
  };
  rows.forEach((row, i) => {
    if (row.s === 0) {
      if (run) {
        run.pts.push(row);
        flush();
      }
      return;
    }
    const kind = row.s > 0 ? "in" : "out";
    if (!run || run.kind !== kind) {
      flush();
      const before = rows[i - 1];
      run = { kind, pts: before && before.s === 0 ? [before] : [] };
    }
    run.pts.push(row);
  });
  flush();
  return segments;
}

export interface FlowDatum {
  key: string;
  income: number;
  spent: number;
}

export interface FlowScale {
  /** Max value above / below the zero line (minor units) after outlier clipping. */
  upTop: number;
  downTop: number;
  upTicks: number[];
  downTicks: number[];
  upClipped: boolean;
  downClipped: boolean;
  /** Pixels per minor unit, shared by both halves. */
  pxPerUnit: number;
  /** Distance from the top of the plot to the zero line. */
  zeroY: number;
}

/**
 * Diverging domain: income rises above zero, spending drops below, one px-per-unit scale for both. Each side
 * clips its outliers with the shared `barDomain` rule so normal days stay readable.
 */
export function flowScale(
  data: readonly FlowDatum[],
  plotHeight: number,
): FlowScale {
  const mean = (list: number[]) => {
    const pos = list.filter((v) => v > 0);
    return pos.length === 0 ? 0 : pos.reduce((s, v) => s + v, 0) / pos.length;
  };
  const incomes = data.map((d) => d.income);
  const spends = data.map((d) => d.spent);
  // One outlier rule over every bar, so a lump salary clips instead of flattening the spending bars.
  const all = barDomain(
    [...incomes, ...spends],
    mean([...incomes, ...spends]),
    2,
  );
  const ceiling = all.clipped ? all.top : Infinity;
  const side = (values: number[]) => {
    const max = Math.min(
      values.reduce((m, v) => Math.max(m, v), 0),
      ceiling,
    );
    // The axis ends at the data, not at the next nice tick, so no half of the plot sits empty.
    const ticks = niceTicks(max, 2).ticks.filter((t) => t <= max);
    return { top: max, ticks, clipped: values.some((v) => v > max) };
  };
  const up = side(incomes);
  const down = side(spends);
  let upTop = up.top;
  let downTop = down.top;
  // Keep a sliver of room on an empty side so the zero line is not welded to an edge.
  if (upTop <= 0 && downTop > 0) upTop = downTop * 0.3;
  if (downTop <= 0 && upTop > 0) downTop = upTop * 0.3;
  const total = upTop + downTop;
  const pxPerUnit = total > 0 ? plotHeight / total : 0;
  const keepTicks = (top: number, own: { ticks: number[]; top: number }) =>
    own.top > 0 ? own.ticks : niceTicks(top, 1).ticks;
  return {
    upTop,
    downTop,
    upTicks: keepTicks(upTop, up),
    downTicks: keepTicks(downTop, down),
    upClipped: up.clipped,
    downClipped: down.clipped,
    pxPerUnit,
    zeroY: upTop * pxPerUnit,
  };
}

/** Running net (income minus spending) per bucket. */
export function runningNet(data: readonly FlowDatum[]): number[] {
  let sum = 0;
  return data.map((d) => (sum += d.income - d.spent));
}

/**
 * Pixel offsets from the zero line (negative = above) for the running net, drawn on its own zero-aligned scale so a
 * lump salary does not flatten the daily bars. Fits inside the plot with `fill` of the room on each side.
 */
export function netOffsets(
  net: readonly number[],
  scale: FlowScale,
  plotHeight: number,
  fill = 0.9,
): number[] {
  const maxPos = net.reduce((m, v) => Math.max(m, v), 0);
  const maxNeg = net.reduce((m, v) => Math.max(m, -v), 0);
  const roomUp = scale.zeroY * fill;
  const roomDown = (plotHeight - scale.zeroY) * fill;
  const factors = [
    maxPos > 0 ? roomUp / maxPos : Infinity,
    maxNeg > 0 ? roomDown / maxNeg : Infinity,
  ].filter(Number.isFinite);
  const f = factors.length === 0 ? 0 : Math.min(...factors);
  return net.map((v) => -v * f);
}
