import { create } from 'zustand';

import type { Draft } from './logic';

/** `amount`, `receives`, or `line:<key>`: the target the keypad is editing. */
export type FocusTarget = string;

interface DraftState extends Draft {
  sessionId: number;
  focus: FocusTarget;
  /** Split line whose category the category sheet is choosing; null for the single category. */
  pickingLine: string | null;
  init: (draft: Draft) => number;
  patch: (patch: Partial<Draft>) => void;
  setFocus: (focus: FocusTarget) => void;
  setPickingLine: (key: string | null) => void;
}

let sessions = 0;

/** Draft shared by the add/edit sheet and its native sub-sheets (category grid, date, custom repeat). */
export const useDraftStore = create<DraftState>((set) => ({
  kind: 'expense',
  amount: 0,
  receives: null,
  title: '',
  memo: '',
  categoryId: null,
  accountId: null,
  transferAccountId: null,
  occurredAt: 0,
  repeat: null,
  splits: null,
  appliedTitleNorm: null,
  personId: null,
  tagIds: [],
  receipts: [],
  sessionId: 0,
  focus: 'amount',
  pickingLine: null,
  init: (draft) => {
    sessions += 1;
    set({ ...draft, sessionId: sessions, focus: 'amount', pickingLine: null });
    return sessions;
  },
  patch: (patch) => set(patch),
  setFocus: (focus) => set({ focus }),
  setPickingLine: (pickingLine) => set({ pickingLine }),
}));

export const selectDraft = (s: DraftState): Draft => ({
  kind: s.kind,
  amount: s.amount,
  receives: s.receives,
  title: s.title,
  memo: s.memo,
  categoryId: s.categoryId,
  accountId: s.accountId,
  transferAccountId: s.transferAccountId,
  occurredAt: s.occurredAt,
  repeat: s.repeat,
  splits: s.splits,
  appliedTitleNorm: s.appliedTitleNorm,
  personId: s.personId,
  tagIds: s.tagIds,
  receipts: s.receipts,
});
