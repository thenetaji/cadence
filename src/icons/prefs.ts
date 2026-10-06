import { useEffect } from 'react';
import { create } from 'zustand';

import { useSetting } from '@/data/hooks';
import type { IconBackground, IconStyle } from '@/db/repos/settings';

type IconPrefsState = {
  style: IconStyle;
  background: IconBackground;
  setStyle: (style: IconStyle) => void;
  setBackground: (background: IconBackground) => void;
};

/**
 * In-memory mirror of the `icon_style` / `icon_background` settings. Hundreds of tiles read it, so they
 * subscribe to this store instead of each running a settings query.
 */
export const useIconPrefs = create<IconPrefsState>((set) => ({
  style: 'phosphor-duotone',
  background: 'graphite-glyph',
  setStyle: (style) => set({ style }),
  setBackground: (background) => set({ background }),
}));

/** Mount once near the root: keeps the store in step with the persisted settings. */
export function useIconPrefsSync(): void {
  const [style] = useSetting('icon_style');
  const [background] = useSetting('icon_background');
  useEffect(() => {
    useIconPrefs.setState({ style, background });
  }, [style, background]);
}
