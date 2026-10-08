/** Small colour helpers for icon tiles. Everything returns `rgba()` / hex so React Native's gradient parser accepts it. */

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h.slice(0, 6);
  const n = Number.parseInt(full, 16);
  if (Number.isNaN(n)) return [128, 128, 128];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Hue (0-360) of a hex colour. */
export function hueOf(hex: string): number {
  const [r8, g8, b8] = hexToRgb(hex);
  const r = r8 / 255;
  const g = g8 / 255;
  const b = b8 / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 0;
  let h: number;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return Math.round(h * 60) % 360;
}

/** hsl(h, s%, l%) with optional alpha, as an `rgba()` string. */
export function hsl(h: number, s: number, l: number, a = 1): string {
  const sat = s / 100;
  const lig = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const f = (n: number) =>
    lig -
    sat *
      Math.min(lig, 1 - lig) *
      Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const to = (v: number) => Math.round(v * 255);
  return `rgba(${to(f(0))}, ${to(f(8))}, ${to(f(4))}, ${Math.round(a * 1000) / 1000})`;
}

/** The same colour at zero alpha, so gradients fade without a dark fringe. */
export function clear(color: string): string {
  const m = /rgba?\(([^)]+)\)/.exec(color);
  if (!m) return "rgba(0, 0, 0, 0)";
  const [r, g, b] = (m[1] as string).split(",").map((p) => p.trim());
  return `rgba(${r}, ${g}, ${b}, 0)`;
}
