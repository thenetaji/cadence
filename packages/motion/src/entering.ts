import { Platform } from 'react-native';
import { FadeIn, FadeInDown, ReduceMotion } from 'react-native-reanimated';

import { staggerDelay, type StaggerOptions } from './timing';
import { motion } from './tokens';

/**
 * `entering` for the sibling at `index`: fade + 12 pt rise on a soft spring, 35 ms apart, only for
 * the first ~10. Beyond the cap it returns `undefined` (no animation, no wait). Reduce Motion is
 * honoured by Reanimated itself (`ReduceMotion.System` skips the animation entirely).
 * Use only for first mount; for recycled list rows go through `EntryTracker`.
 */
export function enteringFor(index: number, options: StaggerOptions = {}) {
  // Web is screenshots/e2e only: CSS-driven entering there mis-measures wrapper heights, so skip it.
  if (Platform.OS === 'web') return undefined;
  const delay = staggerDelay(index, options);
  if (delay === null) return undefined;
  return FadeInDown.delay(delay)
    .springify()
    .damping(motion.springs.enter.damping)
    .stiffness(motion.springs.enter.stiffness)
    .mass(motion.springs.enter.mass)
    .withInitialValues({ opacity: 0, transform: [{ translateY: motion.rise }] })
    .reduceMotion(ReduceMotion.System);
}

/** A plain, quick fade for things that should not travel (tab crossfade, text under an icon). */
export function fadeIn(delay = 0, duration: number = motion.durations.fade) {
  if (Platform.OS === 'web') return undefined;
  return FadeIn.delay(delay).duration(duration).reduceMotion(ReduceMotion.System);
}

/** A row that appeared after the list was already on screen (save, undo): spring rise, no stagger. */
export function insertedEntering() {
  if (Platform.OS === 'web') return undefined;
  return FadeInDown.springify()
    .damping(motion.springs.layout.damping)
    .stiffness(motion.springs.layout.stiffness)
    .withInitialValues({ opacity: 0, transform: [{ translateY: -motion.rise }] })
    .reduceMotion(ReduceMotion.System);
}
