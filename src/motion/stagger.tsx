import * as React from 'react';
import Animated from 'react-native-reanimated';
import type { StyleProp, ViewStyle } from 'react-native';

import { enteringFor } from './entering';
import type { StaggerOptions } from './timing';

type StaggerProps = StaggerOptions & {
  /** Position among siblings. */
  index: number;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  className?: string;
};

/**
 * Wraps one card or section: `<Stagger index={2}>…</Stagger>`. Entrance plays once, when the
 * wrapper first mounts. The wrapper is a plain View, so it does not change layout.
 */
function Stagger({ index, step, cap, base, children, style, className }: StaggerProps) {
  // Computed once: a re-render must never hand Reanimated a new `entering`.
  const [entering] = React.useState(() => enteringFor(index, { step, cap, base }));
  return (
    <Animated.View entering={entering} style={style} className={className}>
      {children}
    </Animated.View>
  );
}

export { Stagger };
export type { StaggerProps };
