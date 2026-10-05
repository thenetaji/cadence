import * as React from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { UndoToast } from '@/components/app/undo-toast';
import { haptic } from '@/theme/haptics';
import { useToastStore } from '@/components/app/toast-store';

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
        <Animated.View key={toast.id} entering={FadeInDown.duration(250)} exiting={FadeOutDown.duration(200)}>
          <UndoToast
            message={toast.message}
            actionLabel={toast.actionLabel}
            onAction={() => {
              haptic('light');
              toast.onAction?.();
              dismiss(toast.id);
            }}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

export { ToastHost };
