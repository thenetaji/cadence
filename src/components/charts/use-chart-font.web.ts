import { useFont, type SkFont } from '@shopify/react-native-skia';

import type { ChartFontWeight } from './use-chart-font';

export type { ChartFontWeight };

/** Web has no Skia system font manager; screenshots use a bundled DejaVu Sans (it has the rupee glyph) from `public/`. */
export function useChartFont(size: number, weight: ChartFontWeight = 'medium'): SkFont | null {
  return useFont(weight === 'regular' ? '/chart-font.ttf' : '/chart-font-bold.ttf', size);
}
