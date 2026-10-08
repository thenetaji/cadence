import { create } from "zustand";

export interface CategoryRequest {
  selected: readonly string[];
  /** Called with the full selection after every toggle, so the form is current while the sheet is open. */
  onChange: (ids: string[]) => void;
}

type CategoryState = {
  request: CategoryRequest | null;
  open: (request: CategoryRequest) => void;
  close: () => void;
};

/** In-memory hand-off between the budget form and its category grid sheet. */
export const useCategoryRequest = create<CategoryState>((set) => ({
  request: null,
  open: (request) => set({ request }),
  close: () => set({ request: null }),
}));
