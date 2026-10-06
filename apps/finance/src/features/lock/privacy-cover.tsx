import { BlurView } from 'expo-blur';
import * as React from 'react';
import { AccessibilityInfo, Platform, StyleSheet, View } from 'react-native';

import { useTokens } from '@studio/theme';

/** True when the user has turned on Reduce Transparency (iOS); always false elsewhere. */
export function useReduceTransparency(): boolean {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    if (Platform.OS !== 'ios') return;
    let alive = true;
    AccessibilityInfo.isReduceTransparencyEnabled().then((value) => {
      if (alive) setReduced(value);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setReduced);
    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);
  return reduced;
}

/** Covers the screen while the app is inactive or in the background: a blur, or an opaque `bg` with Reduce Transparency (and on Android). */
export function PrivacyCover() {
  const { colors, scheme } = useTokens();
  const reduced = useReduceTransparency();
  if (reduced || Platform.OS === 'android') {
    return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]} />;
  }
  return <BlurView intensity={60} tint={scheme === 'dark' ? 'dark' : 'light'} pointerEvents="none" style={StyleSheet.absoluteFill} />;
}
