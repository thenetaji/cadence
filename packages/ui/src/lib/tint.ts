import * as React from "react";
import { useReducedMotion } from "react-native-reanimated";

import { mixColors } from "./color-mix";

export { luminance, mixColors, parseColor, readableOn } from "./color-mix";

const STEP_MS = 24;

/**
 * Follows `target` with a short linear crossfade (200 ms) and returns the colour to render. For native props that
 * cannot take an animated value (the iOS segmented control); everything else should animate on the UI thread. Only
 * the calling component re-renders, about eight times per change. Instant under Reduce Motion.
 */
export function useTweenedColor(target: string, duration = 200): string {
  const reduced = useReducedMotion();
  const [state, setState] = React.useState({ from: target, to: target, t: 1 });
  const [seen, setSeen] = React.useState(target);
  if (seen !== target) {
    setSeen(target);
    const now = mixColors(state.from, state.to, state.t);
    setState({ from: now, to: target, t: reduced ? 1 : 0 });
  }
  const running = state.t < 1;
  React.useEffect(() => {
    if (!running) return;
    const start = Date.now();
    const timer = setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / duration);
      setState((s) => ({ ...s, t }));
      if (t >= 1) clearInterval(timer);
    }, STEP_MS);
    return () => clearInterval(timer);
  }, [running, state.to, duration]);
  return state.t >= 1 ? state.to : mixColors(state.from, state.to, state.t);
}
