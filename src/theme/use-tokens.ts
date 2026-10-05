import { useMemo } from 'react';
import { useUniwind } from 'uniwind';

import {
  categoryColors,
  colors,
  durations,
  radii,
  shadows,
  spacing,
  springs,
  typeScale,
  type CategoryColorKey,
  type Scheme,
} from '@/theme/tokens';

export function useTokens() {
  const { theme } = useUniwind();
  const scheme: Scheme = theme === 'dark' ? 'dark' : 'light';
  return useMemo(
    () => ({
      scheme,
      isDark: scheme === 'dark',
      colors: colors[scheme],
      category: categoryColors[scheme],
      spacing,
      radii,
      typeScale,
      durations,
      springs,
      shadows,
    }),
    [scheme],
  );
}

export function useCategoryColor(key: CategoryColorKey): string {
  const { category } = useTokens();
  return category[key];
}
