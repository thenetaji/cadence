import { create } from "zustand";

import type { ImportFormat, ImportRow } from "@/lib/csv";

type PendingImport = {
  format: ImportFormat;
  rows: ImportRow[];
  unreadable: number;
};

type ImportState = {
  pending: PendingImport | null;
  set: (pending: PendingImport | null) => void;
};

/** The parsed file handed from the Import list to its preview screen. */
export const useImportStore = create<ImportState>((set) => ({
  pending: null,
  set: (pending) => set({ pending }),
}));
