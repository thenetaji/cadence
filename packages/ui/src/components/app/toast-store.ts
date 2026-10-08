import { create } from "zustand";

import { haptic, type HapticKind } from "@studio/theme";
import { durations } from "@studio/theme";

type ToastInput = {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
  haptic?: HapticKind | false;
};

type Toast = ToastInput & { id: number; duration: number };

type ToastState = {
  toast: Toast | null;
  show: (input: ToastInput) => number;
  dismiss: (id?: number) => void;
};

let nextId = 1;

export const useToastStore = create<ToastState>((set, get) => ({
  toast: null,
  show: (input) => {
    const id = nextId++;
    set({
      toast: { ...input, id, duration: input.duration ?? durations.toast },
    });
    if (input.haptic !== false) haptic(input.haptic ?? "success");
    return id;
  },
  dismiss: (id) => {
    const current = get().toast;
    if (current && (id === undefined || current.id === id))
      set({ toast: null });
  },
}));

export function showToast(input: ToastInput): number {
  return useToastStore.getState().show(input);
}

export function dismissToast(id?: number): void {
  useToastStore.getState().dismiss(id);
}

export type { Toast, ToastInput };
