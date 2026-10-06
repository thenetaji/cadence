import { Image } from 'expo-image';
import * as Sharing from 'expo-sharing';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Platform, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { interpolate, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { showToast , Pressable } from '@studio/ui';
import { AppIcon } from '@studio/icons';
import { haptic } from '@studio/theme';

const MAX_ZOOM = 5;
const DISMISS_DISTANCE = 120;
const circle = { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' } as const;

/** Full-screen receipt: pinch to zoom, double-tap to toggle, drag down to dismiss, share. */
export function ReceiptViewer() {
  const { uri } = useLocalSearchParams<{ uri: string; w?: string; h?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const share = async () => {
    try {
      if (!uri || Platform.OS === 'web' || !(await Sharing.isAvailableAsync())) {
        showToast({ message: 'Sharing unavailable', haptic: 'warning' });
        return;
      }
      await Sharing.shareAsync(uri, { dialogTitle: 'Share receipt' });
    } catch {
      showToast({ message: 'Could not share', haptic: 'warning' });
    }
  };

  const reset = () => {
    'worklet';
    scale.value = withSpring(1);
    x.value = withSpring(0);
    y.value = withSpring(0);
    savedScale.value = 1;
    savedX.value = 0;
    savedY.value = 0;
  };

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.min(Math.max(savedScale.value * e.scale, 0.8), MAX_ZOOM);
    })
    .onEnd(() => {
      if (scale.value < 1.05) reset();
      else savedScale.value = scale.value;
    });

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      if (savedScale.value > 1.01) {
        x.value = savedX.value + e.translationX;
        y.value = savedY.value + e.translationY;
      } else {
        y.value = Math.max(e.translationY, 0);
        x.value = e.translationX * 0.3;
      }
    })
    .onEnd((e) => {
      if (savedScale.value > 1.01) {
        savedX.value = x.value;
        savedY.value = y.value;
      } else if (e.translationY > DISMISS_DISTANCE || e.velocityY > 900) {
        runOnJS(close)();
      } else {
        x.value = withSpring(0);
        y.value = withSpring(0);
      }
    });

  const double = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (savedScale.value > 1.01) reset();
      else {
        scale.value = withTiming(2.5, { duration: 220 });
        savedScale.value = 2.5;
        runOnJS(haptic)('light');
      }
    });

  const gesture = Gesture.Exclusive(double, Gesture.Simultaneous(pinch, pan));

  const imageStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: scale.value * interpolate(y.value, [0, 400], [1, 0.82], 'clamp') }],
  }));
  const backdrop = useAnimatedStyle(() => ({ opacity: savedScale.value > 1.01 ? 1 : interpolate(y.value, [0, 300], [1, 0.2], 'clamp') }));

  return (
    <View className="flex-1">
      <Animated.View style={[{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: '#000' }, backdrop]} />
      <GestureDetector gesture={gesture}>
        <Animated.View style={[{ flex: 1, alignItems: 'center', justifyContent: 'center' }, imageStyle]}>
          {uri ? <Image source={{ uri }} style={{ width, height: height - insets.top - insets.bottom - 120 }} contentFit="contain" accessibilityLabel="Receipt" /> : null}
        </Animated.View>
      </GestureDetector>
      <View pointerEvents="box-none" style={{ position: 'absolute', top: insets.top + 8, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' }}>
        <Pressable role="button" accessibilityLabel="Close" haptic="light" hitSlop={6} onPress={close} style={circle}>
          <AppIcon name="close" size={16} color="#FFFFFF" />
        </Pressable>
        <Pressable role="button" accessibilityLabel="Share" haptic="light" hitSlop={6} onPress={() => void share()} style={circle}>
          <AppIcon name="share" size={17} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
}
