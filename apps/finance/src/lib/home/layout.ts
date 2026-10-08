/** Home sections the owner can reorder and hide. The hero (greeting, amount, chart) always stays on top. */
export const HOME_SECTION_IDS = ['quick_add', 'stats', 'coming_up', 'heatmap', 'top_categories', 'recent'] as const;

export type HomeSectionId = (typeof HOME_SECTION_IDS)[number];

export interface HomeSectionPref {
  id: HomeSectionId;
  visible: boolean;
}

export const HOME_SECTION_LABELS: Record<HomeSectionId, string> = {
  quick_add: 'Quick add',
  stats: 'Summary',
  coming_up: 'Coming up',
  heatmap: 'Spending heatmap',
  top_categories: 'Top categories',
  recent: 'Recent',
};

export const DEFAULT_HOME_LAYOUT: readonly HomeSectionPref[] = HOME_SECTION_IDS.map((id) => ({ id, visible: true }));

const isSectionId = (value: unknown): value is HomeSectionId => typeof value === 'string' && (HOME_SECTION_IDS as readonly string[]).includes(value);

/**
 * Repairs a stored layout: drops unknown and duplicate ids, coerces `visible` to a boolean and appends any
 * section the stored value does not mention (a section added in a later build shows up, visible, at the end).
 */
export function normalizeHomeLayout(value: unknown): HomeSectionPref[] {
  const out: HomeSectionPref[] = [];
  const seen = new Set<HomeSectionId>();
  if (Array.isArray(value)) {
    for (const entry of value) {
      const id = (entry as { id?: unknown } | null)?.id;
      if (!isSectionId(id) || seen.has(id)) continue;
      seen.add(id);
      out.push({ id, visible: (entry as { visible?: unknown }).visible !== false });
    }
  }
  for (const id of HOME_SECTION_IDS) if (!seen.has(id)) out.push({ id, visible: true });
  return out;
}

/** Moves the section at `index` by `delta` places; out-of-range moves return the layout unchanged. */
export function moveHomeSection(layout: readonly HomeSectionPref[], index: number, delta: -1 | 1): HomeSectionPref[] {
  const target = index + delta;
  if (index < 0 || index >= layout.length || target < 0 || target >= layout.length) return [...layout];
  const next = [...layout];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item as HomeSectionPref);
  return next;
}

export function setHomeSectionVisible(layout: readonly HomeSectionPref[], id: HomeSectionId, visible: boolean): HomeSectionPref[] {
  return layout.map((s) => (s.id === id ? { ...s, visible } : s));
}

export function isDefaultHomeLayout(layout: readonly HomeSectionPref[]): boolean {
  return layout.length === DEFAULT_HOME_LAYOUT.length && layout.every((s, i) => s.id === DEFAULT_HOME_LAYOUT[i]?.id && s.visible);
}
