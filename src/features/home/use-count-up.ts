import * as React from 'react';
import { AccessibilityInfo } from 'react-native';

import { durations } from '@/theme/tokens';

let played = false;

const easeOut = (t: number) => 1 - (1 - t) ** 3;

/** Counts from 0 to `target` over 400ms the first time it mounts in a session; instant afterwards and with Reduce Motion. */
export function useCountUp(target: number): number {
  const [progress, setProgress] = React.useState<number | null>(played ? null : 0);

  React.useEffect(() => {
    if (played) return;
    played = true;
    let frame = 0;
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (cancelled) return;
        if (reduce) {
          setProgress(null);
          return;
        }
        const start = Date.now();
        const tick = () => {
          const t = Math.min((Date.now() - start) / durations.countUp, 1);
          if (t >= 1) {
            setProgress(null);
            return;
          }
          setProgress(easeOut(t));
          frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, []);

  return progress === null ? target : Math.round(target * progress);
}
