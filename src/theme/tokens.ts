export type Scheme = 'light' | 'dark';

export const categoryKeys = [
  'red',
  'orange',
  'amber',
  'lime',
  'green',
  'teal',
  'cyan',
  'blue',
  'indigo',
  'purple',
  'pink',
  'brown',
  'gray',
] as const;

export type CategoryColorKey = (typeof categoryKeys)[number];

export type SemanticColors = {
  bg: string;
  surface: string;
  elevated: string;
  border: string;
  separator: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  accent: string;
  accentText: string;
  accentSoft: string;
  onAccent: string;
  income: string;
  expense: string;
  warning: string;
  fill: string;
  overlay: string;
  overlayText: string;
};

export const colors: Record<Scheme, SemanticColors> = {
  light: {
    bg: '#F4F2EE',
    surface: '#FFFFFF',
    elevated: '#FFFFFF',
    border: 'rgba(20,18,14,0.07)',
    separator: 'rgba(20,18,14,0.07)',
    text: '#141311',
    textSecondary: '#6C6A66',
    textTertiary: '#A3A09A',
    accent: '#C9A24F',
    accentText: '#9A7224',
    accentSoft: 'rgba(201,162,79,0.14)',
    onAccent: '#141311',
    income: '#1F8A4D',
    expense: '#C8352F',
    warning: '#B8740E',
    fill: '#ECEAE4',
    overlay: '#141311',
    overlayText: '#F4F2EE',
  },
  dark: {
    bg: '#000000',
    surface: '#0E0E10',
    elevated: '#161618',
    border: 'rgba(255,255,255,0.07)',
    separator: 'rgba(255,255,255,0.06)',
    text: '#F7F6F2',
    textSecondary: '#9D9CA3',
    textTertiary: '#5F5F67',
    accent: '#E2B96A',
    accentText: '#E2B96A',
    accentSoft: 'rgba(226,185,106,0.14)',
    onAccent: '#141210',
    income: '#4FD08A',
    expense: '#F0625D',
    warning: '#E8A33D',
    fill: '#18181B',
    overlay: '#F4F2EE',
    overlayText: '#141311',
  },
};

/** Data colours for charts and swatches: `lit` on black, `light-data` on paper. */
export const categoryColors: Record<Scheme, Record<CategoryColorKey, string>> = {
  light: {
    red: '#C2434A',
    orange: '#CC6425',
    amber: '#B98A1E',
    lime: '#6F8F28',
    green: '#2F8E5C',
    teal: '#24897E',
    cyan: '#277F9F',
    blue: '#3764C4',
    indigo: '#5150B9',
    purple: '#7C47B0',
    pink: '#B13E86',
    brown: '#8C6749',
    gray: '#6E6E76',
  },
  dark: {
    red: '#E0565E',
    orange: '#E57A3A',
    amber: '#DDA53A',
    lime: '#9BBE43',
    green: '#4FBF80',
    teal: '#3FB8A9',
    cyan: '#44A9CC',
    blue: '#5B86E0',
    indigo: '#7C7AE0',
    purple: '#A46BD4',
    pink: '#D45FA6',
    brown: '#B48866',
    gray: '#86868E',
  },
};

/** Solid tile fill (same in both schemes); white glyph on top. */
export const categoryInk: Record<CategoryColorKey, string> = {
  red: '#B83840',
  orange: '#C45C22',
  amber: '#B5841F',
  lime: '#6A8C24',
  green: '#2F8C5B',
  teal: '#22877C',
  cyan: '#237B9A',
  blue: '#3562C6',
  indigo: '#514FBE',
  purple: '#7A44B0',
  pink: '#B03C85',
  brown: '#8A6648',
  gray: '#56565E',
};

export const spacing = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48 } as const;
export const gutter = 16;

export const radii = { key: 8, tile: 999, button: 12, card: 18, sheet: 20, pill: 999 } as const;

export type TypeStyle = { size: number; line: number; weight: '400' | '500' | '600' | '700'; tracking: number };

export const typeScale = {
  hero: { size: 44, line: 50, weight: '700', tracking: -2 },
  amountEntry: { size: 44, line: 52, weight: '600', tracking: -1 },
  largeTitle: { size: 34, line: 41, weight: '700', tracking: -0.4 },
  title1: { size: 28, line: 34, weight: '700', tracking: -0.3 },
  title2: { size: 22, line: 28, weight: '600', tracking: -0.2 },
  headline: { size: 17, line: 22, weight: '600', tracking: 0 },
  body: { size: 17, line: 22, weight: '400', tracking: 0 },
  callout: { size: 16, line: 21, weight: '400', tracking: 0 },
  subhead: { size: 15, line: 20, weight: '400', tracking: 0 },
  footnote: { size: 13, line: 18, weight: '400', tracking: 0 },
  caption: { size: 12, line: 16, weight: '500', tracking: 0.1 },
} as const satisfies Record<string, TypeStyle>;

export type TypeVariant = keyof typeof typeScale;

export const durations = { press: 120, chip: 200, progress: 200, row: 250, countUp: 400, toast: 5000 } as const;

export const springs = {
  press: { damping: 20, stiffness: 300, mass: 0.8 },
  layout: { damping: 18, stiffness: 220 },
  sheetChip: { damping: 16, stiffness: 180 },
} as const;

export const pressScale = { row: 0.97, card: 0.97, key: 0.92, fab: 0.92 } as const;
export const pressOpacity = { text: 0.6 } as const;

export const shadows = {
  fab: { shadowColor: '#E2B96A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 14, elevation: 6 },
  toast: { shadowColor: '#000000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
} as const;

export const dynamicType = { hero: 1.4, keypad: 1.2, rowAmount: 1.6, default: 2 } as const;

export function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
