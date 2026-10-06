import { listCategories } from '@/db/repos/categories';
import type { CategoryKind, CategoryRow } from '@/db/schema';
import { useLiveData } from '../use-live-data';

export function useCategories(kind?: CategoryKind): CategoryRow[] {
  return useLiveData(['categories'], kind ?? 'all', (db) => listCategories(db, kind));
}
