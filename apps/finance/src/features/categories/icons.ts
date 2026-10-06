import { conceptFor, conceptMeta } from '@/icons/registry';

export type IconSection = { title: string; ids: string[] };

/** Concepts offered in the picker: everything except bare UI glyphs, in theme order. */
const PICKABLE = conceptMeta.filter((c) => !c.theme.startsWith('_'));

/** Search words of a concept id: its label, id and keywords. */
export function iconWords(id: string): string[] {
  const meta = conceptMeta.find((c) => c.id === id);
  return meta ? meta.words.split(' ') : id.split('-');
}

/**
 * Picker sections (one per theme) for a query. Every typed word must prefix a search word. A current icon
 * that is not pickable (a legacy or UI glyph) is kept in a leading "Current" section when nothing is typed.
 */
export function iconSections(query: string, current?: string): IconSection[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const sections: IconSection[] = [];
  const byTheme = new Map<string, IconSection>();
  for (const c of PICKABLE) {
    if (words.length > 0) {
      const haystack = c.words.split(' ');
      if (!words.every((w) => haystack.some((h) => h.startsWith(w)))) continue;
    }
    let section = byTheme.get(c.theme);
    if (!section) {
      section = { title: c.theme, ids: [] };
      byTheme.set(c.theme, section);
      sections.push(section);
    }
    section.ids.push(c.id);
  }
  if (current && words.length === 0) {
    const id = conceptFor(current);
    if (!PICKABLE.some((c) => c.id === id)) sections.unshift({ title: 'Current', ids: [id] });
  }
  return sections;
}

export function pickableCount(): number {
  return PICKABLE.length;
}
