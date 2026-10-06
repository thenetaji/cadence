import { Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';

import { scrollProgress } from './timing';

/** `scrollY` shared value plus the handler to put on an Animated scroll view (`onScroll`). */
export function useScrollY() {
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });
  return { scrollY, onScroll };
}

type ScrollFxOptions = {
  /** Offset at which the sticky header starts fading in. */
  headerStart?: number;
  headerEnd?: number;
  /** Hero scale at full collapse. */
  heroMinScale?: number;
  heroRange?: number;
  /** Parallax: pt moved per pt scrolled (0.3 trails the content). */
  parallax?: number;
};

/**
 * Scroll-linked styles, all on the UI thread:
 * `headerStyle` fades in, `heroStyle` shrinks and fades as you scroll, `parallaxStyle` trails.
 */
export function useScrollFx(scrollY: SharedValue<number>, options: ScrollFxOptions = {}) {
  const { headerStart = 40, headerEnd = 100, heroMinScale = 0.92, heroRange = 160, parallax = 0.3 } = options;
  const headerStyle = useAnimatedStyle(() => ({ opacity: scrollProgress(scrollY.value, headerStart, headerEnd) }));
  const heroStyle = useAnimatedStyle(() => {
    const y = Math.max(0, scrollY.value);
    return {
      opacity: interpolate(y, [0, heroRange], [1, 0.4], Extrapolation.CLAMP),
      transform: [{ scale: interpolate(y, [0, heroRange], [1, heroMinScale], Extrapolation.CLAMP) }],
    };
  });
  const parallaxStyle = useAnimatedStyle(() => ({ transform: [{ translateY: scrollY.value * parallax }] }));
  return { headerStyle, heroStyle, parallaxStyle };
}
