import { create } from "zustand";

import type { DateKey } from "@studio/dates";

export interface RangeRequest {
  initial: { from: DateKey; to: DateKey };
  onApply: (range: { from: DateKey; to: DateKey }) => void;
}

type RangeState = {
  request: RangeRequest | null;
  open: (request: RangeRequest) => void;
  close: () => void;
};

/** In-memory hand-off between the Insights screen and the custom range sheet. */
export const useRangeStore = create<RangeState>((set) => ({
  request: null,
  open: (request) => set({ request }),
  close: () => set({ request: null }),
}));
