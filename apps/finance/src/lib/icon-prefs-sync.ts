import { useEffect } from "react";

import { useSetting } from "@/data/hooks";
import { useIconPrefs } from "@studio/icons";

/** Mount once near the root: keeps the store in step with the persisted settings. */
export function useIconPrefsSync(): void {
  const [style] = useSetting("icon_style");
  const [background] = useSetting("icon_background");
  useEffect(() => {
    useIconPrefs.setState({ style, background });
  }, [style, background]);
}
