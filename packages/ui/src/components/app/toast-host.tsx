import * as React from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeInDown, FadeOutDown, ReduceMotion, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { UndoToast } from './undo-toast';
import { haptic } from '@studio/theme';
import { useToastStore } from './toast-store';
import { motion } from '@studio/motion';

/** Spring up from the bottom with a slight overshoot. */
const toastEntering = FadeInDown.springify()
  .damping(motion.springs.toast.damping)
  .stiffness(motion.springs.toast.stiffness)
  .mass(motion.springs.toast.mass)
  .withInitialValues({ opacity: 0, transform: [{ translateY: 90 }] })
  .reduceMotion(ReduceMotion.System);

type SwipeProps = { onDismiss: () => void; children: React.ReactNode };

/** Drag down to dismiss; a short drag springs back. */
function SwipeToDismiss({ onDismiss, children }: SwipeProps) {
  const y = useSharedValue(0);
  const pan = Gesture.Pan()
    .activeOffsetY([-6, 6])
    .onUpdate((e) => {
      y.value = e.translationY > 0 ? e.translationY : e.translationY / 6;
    })
    .onEnd((e) => {
      if (e.translationY > 36 || e.velocityY > 500) {
        y.value = withTiming(160, { duration: 180 }, (done) => {
          if (done) runOnJS(onDismiss)();
        });
      } else {
        y.value = withSpring(0, motion.springs.toast);
      }
    });
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={style}>{children}</Animated.View>
    </GestureDetector>
  );
}

type ToastHostProps = { bottomOffset?: number };

function ToastHost({ bottomOffset = 72 }: ToastHostProps) {
  const toast = useToastStore((state) => state.toast);
  const dismiss = useToastStore((state) => state.dismiss);
  const insets = useSafeAreaInsets();

  React.useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => dismiss(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, [toast, dismiss]);

  return (
    <View pointerEvents="box-none" style={{ bottom: insets.bottom + bottomOffset }} className="absolute inset-x-0 px-4">
      {toast ? (
        <Animated.View key={toast.id} entering={toastEntering} exiting={FadeOutDown.duration(200)}>
          <SwipeToDismiss onDismiss={() => dismiss(toast.id)}>
            <UndoToast
              message={toast.message}
              actionLabel={toast.actionLabel}
              onAction={() => {
                haptic('light');
                toast.onAction?.();
                dismiss(toast.id);
              }}
            />
          </SwipeToDismiss>
        </Animated.View>
      ) : null}
    </View>
  );
}

export { ToastHost };
