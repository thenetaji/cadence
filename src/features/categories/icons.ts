import { categoryIconNames } from '@/components/app/symbolFallbacks';

const IGNORED = new Set(['fill']);

/** Search words for an SF Symbol name: its dot-separated parts, minus "fill". */
export function iconWords(name: string): string[] {
  return name.split('.').filter((part) => part.length > 0 && !IGNORED.has(part));
}

/** Curated icons whose name contains every typed word; the current icon is kept first even when it is not curated. */
export function filterIcons(query: string, current?: string): string[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const base: string[] = [...categoryIconNames];
  if (current && !base.includes(current)) base.unshift(current);
  if (words.length === 0) return base;
  return base.filter((name) => {
    const haystack = iconWords(name).join(' ').toLowerCase();
    return words.every((word) => haystack.includes(word));
  });
}
