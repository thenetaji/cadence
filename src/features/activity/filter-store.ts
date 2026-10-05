import { create } from 'zustand';

import type { TransactionKind } from '@/db/schema';

type ActivityFilterState = {
  kinds: TransactionKind[];
  categoryId: string | null;
  accountId: string | null;
  toggleKind: (kind: TransactionKind) => void;
  setCategory: (id: string | null) => void;
  setAccount: (id: string | null) => void;
  clear: () => void;
};

/** Activity filters live outside the screen so the filter sheet and the chip row share them. */
export const useActivityFilters = create<ActivityFilterState>((set) => ({
  kinds: [],
  categoryId: null,
  accountId: null,
  toggleKind: (kind) => set((s) => ({ kinds: s.kinds.includes(kind) ? s.kinds.filter((k) => k !== kind) : [...s.kinds, kind] })),
  setCategory: (categoryId) => set({ categoryId }),
  setAccount: (accountId) => set({ accountId }),
  clear: () => set({ kinds: [], categoryId: null, accountId: null }),
}));

export function activeFilterCount(state: Pick<ActivityFilterState, 'kinds' | 'categoryId' | 'accountId'>): number {
  return state.kinds.length + (state.categoryId ? 1 : 0) + (state.accountId ? 1 : 0);
}

export function useActiveFilterCount(): number {
  return useActivityFilters((s) => activeFilterCount(s));
}
