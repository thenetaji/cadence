import { matchFont, type SkFont } from '@shopify/react-native-skia';
import { Platform } from 'react-native';
import { useMemo } from 'react';

export type ChartFontWeight = 'regular' | 'medium' | 'semibold';

const WEIGHTS: Record<ChartFontWeight, '400' | '500' | '600'> = { regular: '400', medium: '500', semibold: '600' };

/** The platform system font (SF Pro on iOS, Roboto on Android) at `size`, via Skia `matchFont`. */
export function useChartFont(size: number, weight: ChartFontWeight = 'medium'): SkFont | null {
  return useMemo(
    () =>
      matchFont({
        fontFamily: Platform.select({ ios: 'System', default: 'sans-serif' }),
        fontSize: size,
        fontWeight: WEIGHTS[weight],
      }),
    [size, weight],
  );
}
