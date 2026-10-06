type Rgba = readonly [number, number, number, number];

/** Parses `#rgb`, `#rrggbb`, `rgb()` and `rgba()`; anything else reads as opaque black. */
export function parseColor(color: string): Rgba {
  const value = color.trim();
  if (value.startsWith('#')) {
    const hex = value.slice(1);
    const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex;
    const n = (i: number) => Number.parseInt(full.slice(i, i + 2), 16);
    return [n(0) || 0, n(2) || 0, n(4) || 0, full.length >= 8 ? (n(6) || 0) / 255 : 1];
  }
  const match = /^rgba?\(([^)]+)\)$/.exec(value);
  if (match) {
    const parts = match[1]!.split(',').map((p) => Number.parseFloat(p));
    return [parts[0] || 0, parts[1] || 0, parts[2] || 0, parts[3] ?? 1];
  }
  return [0, 0, 0, 1];
}

/** Linear mix of two colours, `t` 0 to 1, as an `rgba()` string. */
export function mixColors(from: string, to: string, t: number): string {
  const a = parseColor(from);
  const b = parseColor(to);
  const at = Math.min(1, Math.max(0, t));
  const channel = (i: 0 | 1 | 2) => Math.round(a[i] + (b[i] - a[i]) * at);
  const alpha = Math.round((a[3] + (b[3] - a[3]) * at) * 1000) / 1000;
  return `rgba(${channel(0)},${channel(1)},${channel(2)},${alpha})`;
}

const channelLight = (v: number) => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

/** WCAG relative luminance of a colour. */
export function luminance(color: string): number {
  const [r, g, b] = parseColor(color);
  return 0.2126 * channelLight(r) + 0.7152 * channelLight(g) + 0.0722 * channelLight(b);
}

/** Whichever of `dark` or `light` reads better on a `background` fill. */
export function readableOn(background: string, dark: string, light: string): string {
  const l = luminance(background);
  const contrast = (other: string) => {
    const o = luminance(other);
    return (Math.max(l, o) + 0.05) / (Math.min(l, o) + 0.05);
  };
  return contrast(dark) >= contrast(light) ? dark : light;
}
