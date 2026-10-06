import { create } from "zustand";

export type HeroPeriod = "month" | "all";

type HeroPeriodState = {
  period: HeroPeriod;
  set: (period: HeroPeriod) => void;
};

/** Home hero period for this session only: always starts on "This month" after a launch. */
export const useHeroPeriod = create<HeroPeriodState>((set) => ({
  period: "month",
  set: (period) => set({ period }),
}));
