import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { create } from 'zustand';

export type HapticKind = 'light' | 'medium' | 'selection' | 'success' | 'warning' | 'error';

type HapticsState = { enabled: boolean; setEnabled: (enabled: boolean) => void };

export const useHapticsStore = create<HapticsState>((set) => ({
  enabled: true,
  setEnabled: (enabled) => set({ enabled }),
}));

export function setHapticsEnabled(enabled: boolean): void {
  useHapticsStore.getState().setEnabled(enabled);
}

export function haptic(kind: HapticKind, enabled: boolean = useHapticsStore.getState().enabled): void {
  if (!enabled || Platform.OS === 'web') return;
  const run = (): Promise<void> => {
    switch (kind) {
      case 'light':
        return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      case 'medium':
        return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      case 'selection':
        return Haptics.selectionAsync();
      case 'success':
        return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      case 'warning':
        return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      case 'error':
        return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };
  run().catch(() => undefined);
}
