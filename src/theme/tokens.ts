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
    bg: '#F2F2F7',
    surface: '#FFFFFF',
    elevated: '#FFFFFF',
    border: '#E3E3E8',
    separator: 'rgba(60,60,67,0.12)',
    text: '#111114',
    textSecondary: '#6E6E76',
    textTertiary: '#A5A5AD',
    accent: '#2E5BFF',
    accentSoft: 'rgba(46,91,255,0.12)',
    onAccent: '#FFFFFF',
    income: '#1E9E5A',
    expense: '#D93A3A',
    warning: '#D98A0B',
    fill: '#E9E9EE',
    overlay: '#1C1C1E',
    overlayText: '#F5F5F7',
  },
  dark: {
    bg: '#000000',
    surface: '#1C1C1E',
    elevated: '#2C2C2E',
    border: '#2A2A2E',
    separator: 'rgba(84,84,88,0.40)',
    text: '#F5F5F7',
    textSecondary: '#A1A1AA',
    textTertiary: '#6B6B72',
    accent: '#6B8CFF',
    accentSoft: 'rgba(107,140,255,0.18)',
    onAccent: '#FFFFFF',
    income: '#3DD68C',
    expense: '#FF5C5C',
    warning: '#FFB224',
    fill: '#2C2C2E',
    overlay: '#F2F2F7',
    overlayText: '#1C1C1E',
  },
};

export const categoryColors: Record<Scheme, Record<CategoryColorKey, string>> = {
  light: {
    red: '#E5484D',
    orange: '#F76B15',
    amber: '#E8A317',
    lime: '#7CB342',
    green: '#30A46C',
    teal: '#12A594',
    cyan: '#0AA2C0',
    blue: '#3E63DD',
    indigo: '#5B5BD6',
    purple: '#8E4EC6',
    pink: '#D6409F',
    brown: '#AD7F58',
    gray: '#8B8D98',
  },
  dark: {
    red: '#F2555A',
    orange: '#FF801F',
    amber: '#FFB224',
    lime: '#8FD14F',
    green: '#3DD68C',
    teal: '#0BD8B6',
    cyan: '#23C4E0',
    blue: '#5B8DEF',
    indigo: '#7B7BF0',
    purple: '#B06AE4',
    pink: '#F065B8',
    brown: '#C49A74',
    gray: '#9A9CA6',
  },
};

export const spacing = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48 } as const;
export const gutter = 16;

export const radii = { key: 8, tile: 10, button: 12, card: 14, sheet: 20, pill: 999 } as const;

export type TypeStyle = { size: number; line: number; weight: '400' | '500' | '600' | '700'; tracking: number };

export const typeScale = {
  hero: { size: 36, line: 44, weight: '600', tracking: -0.8 },
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
  fab: { shadowColor: '#000000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.16, shadowRadius: 12, elevation: 6 },
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
