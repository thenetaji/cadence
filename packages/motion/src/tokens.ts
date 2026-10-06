import { durations, springs } from '@studio/theme';

/** Motion constants shared by every primitive. Springs for anything that moves, timing for fades. */
export const motion = {
  /** Entrance rise in pt. */
  rise: 12,
  /** Delay between siblings, ms. */
  staggerStep: 35,
  /** Only the first N siblings animate; later ones appear instantly so long lists never wait. */
  staggerCap: 10,
  durations: {
    ...durations,
    fade: 250,
    draw: 700,
    comet: 900,
    shimmer: 700,
    float: 3000,
    pulse: 600,
  },
  springs: {
    ...springs,
    /** Entrance: soft, barely any overshoot. */
    enter: { damping: 18, stiffness: 210, mass: 0.9 },
    /** Odometer digit column. Clamped so a column never shows blank space past 0 or 9. */
    roll: { damping: 18, stiffness: 130, mass: 1, overshootClamping: true },
    /** New digit dropping in while typing. */
    drop: { damping: 14, stiffness: 320, mass: 0.7 },
    /** Selection bounce. */
    pop: { damping: 10, stiffness: 420, mass: 0.6 },
    /** Charts: bars and rings settle on new values. */
    chart: { damping: 17, stiffness: 150, mass: 1 },
    /** Toast: slight overshoot on arrival. */
    toast: { damping: 12, stiffness: 190, mass: 0.9 },
    /** Save key morph. */
    morph: { damping: 11, stiffness: 260, mass: 0.7 },
    /** Progress fill. */
    fill: { damping: 20, stiffness: 120, mass: 1 },
  },
  popScale: 1.08,
} as const;

export type MotionSpring = (typeof motion.springs)[keyof typeof motion.springs];
